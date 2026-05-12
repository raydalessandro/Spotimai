import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Library, Playlist } from '../lib/types';

const STORAGE_KEY = 'own-music:drafts';
const SCHEMA_VERSION = 1;

type Stored = { schemaVersion: number; drafts: Playlist[] };

const DIACRITICS = /[̀-ͯ]/g;
export const slugify = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(DIACRITICS, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const readStored = (): Playlist[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Stored;
    if (parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.drafts)) return [];
    return parsed.drafts;
  } catch {
    return [];
  }
};

const writeStored = (drafts: Playlist[]) => {
  try {
    const payload: Stored = { schemaVersion: SCHEMA_VERSION, drafts };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
};

export type CreateResult = { ok: true; playlist: Playlist } | { ok: false; reason: 'empty' | 'duplicate' };

export function useCustomPlaylists(library: Library | null) {
  const [allDrafts, setAllDrafts] = useState<Playlist[]>(() => readStored());

  const manifestIndex = useMemo(() => {
    const ids = new Set<string>();
    const names = new Set<string>();
    for (const p of library?.customPlaylists ?? []) {
      ids.add(p.id);
      names.add(p.name.toLowerCase().trim());
    }
    return { ids, names };
  }, [library]);

  // Dedup: una volta che una draft compare nel manifest (stesso id o nome normalizzato),
  // la rimuoviamo da localStorage per sempre. Il manifest è la sorgente di verità.
  useEffect(() => {
    setAllDrafts(prev => {
      const filtered = prev.filter(d =>
        !manifestIndex.ids.has(d.id) &&
        !manifestIndex.names.has(d.name.toLowerCase().trim())
      );
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [manifestIndex]);

  useEffect(() => {
    writeStored(allDrafts);
  }, [allDrafts]);

  const create = useCallback((rawName: string): CreateResult => {
    const name = rawName.trim();
    if (!name) return { ok: false, reason: 'empty' };
    const id = slugify(name);
    if (!id) return { ok: false, reason: 'empty' };
    const normalized = name.toLowerCase();
    const isDup =
      manifestIndex.ids.has(id) ||
      manifestIndex.names.has(normalized) ||
      allDrafts.some(d => d.id === id || d.name.toLowerCase() === normalized);
    if (isDup) return { ok: false, reason: 'duplicate' };
    const playlist: Playlist = { id, name, trackIds: [], createdAt: new Date().toISOString() };
    setAllDrafts(prev => [...prev, playlist]);
    return { ok: true, playlist };
  }, [allDrafts, manifestIndex]);

  const remove = useCallback((id: string) => {
    setAllDrafts(prev => prev.filter(d => d.id !== id));
  }, []);

  const rename = useCallback((id: string, rawName: string): CreateResult => {
    const name = rawName.trim();
    if (!name) return { ok: false, reason: 'empty' };
    const normalized = name.toLowerCase();
    const dup =
      manifestIndex.names.has(normalized) ||
      allDrafts.some(d => d.id !== id && d.name.toLowerCase() === normalized);
    if (dup) return { ok: false, reason: 'duplicate' };
    const existing = allDrafts.find(d => d.id === id);
    if (!existing) return { ok: false, reason: 'empty' };
    const updated: Playlist = { ...existing, name };
    setAllDrafts(prev => prev.map(d => (d.id === id ? updated : d)));
    return { ok: true, playlist: updated };
  }, [allDrafts, manifestIndex]);

  const addTrack = useCallback((draftId: string, trackId: string) => {
    setAllDrafts(prev => prev.map(d => {
      if (d.id !== draftId) return d;
      if (d.trackIds.includes(trackId)) return d;
      return { ...d, trackIds: [...d.trackIds, trackId] };
    }));
  }, []);

  const removeTrack = useCallback((draftId: string, trackId: string) => {
    setAllDrafts(prev => prev.map(d => {
      if (d.id !== draftId) return d;
      return { ...d, trackIds: d.trackIds.filter(t => t !== trackId) };
    }));
  }, []);

  const exportJSON = useCallback((draftId: string) => {
    const draft = allDrafts.find(d => d.id === draftId);
    if (!draft) return;
    const payload = {
      id: draft.id,
      name: draft.name,
      trackIds: draft.trackIds,
      createdAt: draft.createdAt,
    };
    if (typeof document === 'undefined') return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [allDrafts]);

  return {
    drafts: allDrafts,
    create,
    remove,
    rename,
    addTrack,
    removeTrack,
    exportJSON,
  };
}
