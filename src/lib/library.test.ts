import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadLibrary, audioUrl, trackById } from './library';
import type { Library, Track } from './types';

const sampleLibrary: Library = {
  schemaVersion: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  tracks: [
    { id: 'a', title: 'A', artist: 'X', album: 'AlbA', genre: 'G', duration: 100, path: 'g/x/alba/01-a.mp3' },
    { id: 'b', title: 'B', artist: 'Y', album: 'AlbB', genre: 'G', duration: 200, path: 'g/y/albb/01-b.mp3' },
  ],
  autoPlaylists: { byGenre: { G: ['a', 'b'] }, byArtist: { X: ['a'], Y: ['b'] }, byAlbum: { 'AlbA|X': ['a'], 'AlbB|Y': ['b'] } },
  customPlaylists: [],
};

describe('loadLibrary', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => sampleLibrary,
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ritorna il manifest deserializzato', async () => {
    const lib = await loadLibrary();
    expect(lib.schemaVersion).toBe(1);
    expect(lib.tracks).toHaveLength(2);
    expect(lib.autoPlaylists.byGenre.G).toEqual(['a', 'b']);
  });

  it("solleva errore se la risposta non è ok", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    await expect(loadLibrary()).rejects.toThrow(/500/);
  });
});

describe('audioUrl', () => {
  it('costruisce un URL relativo a /music/', () => {
    const t: Track = sampleLibrary.tracks[0];
    expect(audioUrl(t)).toBe('/music/g/x/alba/01-a.mp3');
  });
});

describe('trackById', () => {
  it('trova una traccia per id', () => {
    expect(trackById(sampleLibrary, 'b')?.title).toBe('B');
  });
  it('ritorna undefined se non esiste', () => {
    expect(trackById(sampleLibrary, 'nope')).toBeUndefined();
  });
});
