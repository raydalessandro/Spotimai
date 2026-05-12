import type { Library, Track } from './types';

const BASE_URL = import.meta.env.BASE_URL || '/';

export async function loadLibrary(): Promise<Library> {
  const res = await fetch(`${BASE_URL}library.json`, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`Errore nel caricamento di library.json: ${res.status}`);
  }
  const data = await res.json();
  return data as Library;
}

export function audioUrl(track: Track): string {
  return `${BASE_URL}music/${track.path}`;
}

export function trackById(library: Library, id: string): Track | undefined {
  return library.tracks.find(t => t.id === id);
}
