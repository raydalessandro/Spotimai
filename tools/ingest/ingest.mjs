#!/usr/bin/env node
/**
 * own-music ingest CLI
 *
 * Scansiona public/music/ e genera public/library.json con:
 * - metadata estratti dai tag ID3 (o derivati dal path se assenti)
 * - auto-playlists per genere / artista / album
 * - custom playlists da public/music/_playlists/*.json
 * - ID stabili salvati in public/music/_meta/trackids.json
 *
 * Convenzione path:
 *   public/music/<genere-slug>/<artista-slug>/<album-slug>/NN-titolo-slug.mp3
 *
 * Uso:
 *   pnpm ingest
 *   node tools/ingest/ingest.mjs
 */

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, sep, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { parseFile } from 'music-metadata';

const PROJECT_ROOT = process.cwd();
const MUSIC_DIR = join(PROJECT_ROOT, 'public', 'music');
const META_DIR = join(MUSIC_DIR, '_meta');
const PLAYLISTS_DIR = join(MUSIC_DIR, '_playlists');
const TRACKIDS_PATH = join(META_DIR, 'trackids.json');
const LIBRARY_PATH = join(PROJECT_ROOT, 'public', 'library.json');

const AUDIO_EXT = new Set(['.mp3', '.m4a', '.flac', '.ogg', '.opus', '.wav']);

const SCHEMA_VERSION = 1;

// ----- utils -----

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const isSlugValid = (s) => /^[a-z0-9-]+$/.test(s);

const LOWER_WORDS = new Set(['at', 'of', 'in', 'on', 'the', 'a', 'an', 'and', 'or', 'but', 'for', 'to', 'with', 'di', 'da', 'del', 'della', 'dei', 'delle', 'il', 'la', 'lo', 'gli', 'le', 'e', 'o', 'che']);
const titleize = (s) => s.split('-').map((w, i) => {
  if (i > 0 && LOWER_WORDS.has(w)) return w;
  return w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w;
}).join(' ');

const stableHash = async (filePath, bytesToRead = 1024 * 1024) => {
  const buf = await readFile(filePath);
  const sample = buf.subarray(0, Math.min(buf.length, bytesToRead));
  return createHash('md5').update(sample).digest('hex');
};

const nanoid = (n = 10) => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < n; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
};

async function walk(dir, base = dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...await walk(full, base));
    } else if (e.isFile() && AUDIO_EXT.has(extname(e.name).toLowerCase())) {
      out.push(relative(base, full).split(sep).join('/'));
    }
  }
  return out;
}

// ----- main -----

async function main() {
  console.log('\n🎵  own-music ingest\n');

  if (!existsSync(MUSIC_DIR)) {
    console.error(`Cartella ${MUSIC_DIR} non trovata.`);
    process.exit(1);
  }
  await mkdir(META_DIR, { recursive: true });
  await mkdir(PLAYLISTS_DIR, { recursive: true });

  // Load existing track IDs map
  let trackIds = {};
  let hashToId = {};
  if (existsSync(TRACKIDS_PATH)) {
    const raw = await readFile(TRACKIDS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    trackIds = parsed.byPath || {};
    hashToId = parsed.byHash || {};
  }

  const files = await walk(MUSIC_DIR);
  console.log(`Trovati ${files.length} file audio`);

  // Validate naming
  const invalid = [];
  for (const rel of files) {
    const parts = rel.split('/');
    for (const p of parts) {
      const name = p.replace(/\.[^.]+$/, '');
      if (!isSlugValid(name)) invalid.push(rel);
    }
  }
  if (invalid.length > 0) {
    console.warn('\n⚠  File con naming non conforme (solo a-z 0-9 e -):');
    invalid.forEach(f => console.warn('   ' + f));
    console.warn('  Le tracce vengono comunque incluse ma rinominale per pulizia.\n');
  }

  // Build tracks
  const tracks = [];
  const added = [], renamed = [], existing = [];

  for (const rel of files) {
    const fullPath = join(MUSIC_DIR, rel);
    const parts = rel.split('/');
    // expected: genre/artist/album/file.ext  (4 parts)
    let genre = 'Sconosciuto', artist = 'Sconosciuto', album = 'Sconosciuto';
    if (parts.length >= 4) {
      [genre, artist, album] = parts;
    } else if (parts.length === 3) {
      [genre, artist] = parts;
      album = 'Singles';
    } else if (parts.length === 2) {
      [genre] = parts;
      artist = 'Sconosciuto';
    }

    // Parse metadata
    let meta;
    try {
      meta = await parseFile(fullPath, { duration: true });
    } catch (err) {
      console.warn(`✗ Errore lettura ${rel}: ${err.message}`);
      continue;
    }

    const fileName = basename(rel, extname(rel));
    // Try strip leading "NN-" track number
    const titleFromFile = fileName.replace(/^\d+[-_ ]/, '');

    const title = (meta.common.title && meta.common.title.trim()) || titleize(titleFromFile);
    const artistMeta = (meta.common.artist && meta.common.artist.trim()) || titleize(artist);
    const albumMeta = (meta.common.album && meta.common.album.trim()) || titleize(album);
    const genreMeta = (meta.common.genre && meta.common.genre[0]) || titleize(genre);
    const duration = meta.format.duration || 0;
    const year = meta.common.year;

    // Stable ID: try by path, then by content hash, then create new
    let id = trackIds[rel];
    if (!id) {
      const hash = await stableHash(fullPath);
      if (hashToId[hash]) {
        id = hashToId[hash];
        // file was renamed: clean up old paths pointing to same id
        for (const [oldPath, oldId] of Object.entries(trackIds)) {
          if (oldId === id && oldPath !== rel && !files.includes(oldPath)) {
            delete trackIds[oldPath];
          }
        }
        renamed.push(rel);
      } else {
        id = nanoid();
        hashToId[hash] = id;
        added.push(rel);
      }
      trackIds[rel] = id;
    } else {
      existing.push(rel);
    }

    tracks.push({
      id,
      title,
      artist: artistMeta,
      album: albumMeta,
      genre: genreMeta,
      duration: Math.round(duration),
      year,
      path: rel,
    });
  }

  // Cleanup: remove ID mappings for files that no longer exist
  const removed = [];
  for (const oldPath of Object.keys(trackIds)) {
    if (!files.includes(oldPath)) {
      removed.push(oldPath);
      delete trackIds[oldPath];
    }
  }

  // Auto-playlists
  const byGenre = {}, byArtist = {}, byAlbum = {};
  for (const t of tracks) {
    (byGenre[t.genre] = byGenre[t.genre] || []).push(t.id);
    (byArtist[t.artist] = byArtist[t.artist] || []).push(t.id);
    const albumKey = `${t.album}|${t.artist}`;
    (byAlbum[albumKey] = byAlbum[albumKey] || []).push(t.id);
  }

  // Custom playlists
  const customPlaylists = [];
  if (existsSync(PLAYLISTS_DIR)) {
    const plFiles = (await readdir(PLAYLISTS_DIR)).filter(f => f.endsWith('.json'));
    for (const pf of plFiles) {
      try {
        const raw = await readFile(join(PLAYLISTS_DIR, pf), 'utf-8');
        const pl = JSON.parse(raw);
        const validIds = (pl.trackIds || []).filter(tid => tracks.some(t => t.id === tid));
        customPlaylists.push({
          id: pl.id || pf.replace('.json', ''),
          name: pl.name || pf.replace('.json', ''),
          trackIds: validIds,
          createdAt: pl.createdAt,
        });
      } catch (err) {
        console.warn(`✗ Playlist non valida ${pf}: ${err.message}`);
      }
    }
  }

  // Save trackids map
  await writeFile(TRACKIDS_PATH, JSON.stringify({ byPath: trackIds, byHash: hashToId }, null, 2));

  // Save library
  const library = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    tracks,
    autoPlaylists: { byGenre, byArtist, byAlbum },
    customPlaylists,
  };
  await writeFile(LIBRARY_PATH, JSON.stringify(library, null, 2));

  // Report
  console.log('\n── Report ──');
  console.log(`✓ ${tracks.length} tracce indicizzate`);
  if (added.length) console.log(`+ ${added.length} aggiunte`);
  if (renamed.length) console.log(`~ ${renamed.length} rinominate (ID stabile)`);
  if (existing.length) console.log(`  ${existing.length} invariate`);
  if (removed.length) console.log(`- ${removed.length} rimosse dalla mappa`);
  console.log(`✓ ${Object.keys(byGenre).length} generi, ${Object.keys(byArtist).length} artisti, ${Object.keys(byAlbum).length} album`);
  console.log(`✓ ${customPlaylists.length} playlist custom`);
  console.log(`\n→ ${relative(PROJECT_ROOT, LIBRARY_PATH)}`);
  console.log(`→ ${relative(PROJECT_ROOT, TRACKIDS_PATH)}\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
