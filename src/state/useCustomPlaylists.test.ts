import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCustomPlaylists, slugify } from './useCustomPlaylists';
import type { Library, Playlist } from '../lib/types';

const emptyLib: Library = {
  schemaVersion: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  tracks: [],
  autoPlaylists: { byGenre: {}, byArtist: {}, byAlbum: {} },
  customPlaylists: [],
};

const libWith = (playlists: Playlist[]): Library => ({ ...emptyLib, customPlaylists: playlists });

describe('slugify', () => {
  it('toglie accenti, spazi e caratteri speciali', () => {
    expect(slugify('Chill Night')).toBe('chill-night');
    expect(slugify('Café del Mar!')).toBe('cafe-del-mar');
    expect(slugify('  Boom  Bap  ')).toBe('boom-bap');
  });
  it('ritorna stringa vuota per input senza caratteri validi', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('useCustomPlaylists.create', () => {
  it('crea una bozza con id slug del nome', () => {
    const { result } = renderHook(() => useCustomPlaylists(emptyLib));
    let res: any;
    act(() => { res = result.current.create('Chill Night'); });
    expect(res.ok).toBe(true);
    expect(res.playlist.id).toBe('chill-night');
    expect(res.playlist.name).toBe('Chill Night');
    expect(res.playlist.trackIds).toEqual([]);
    expect(result.current.drafts).toHaveLength(1);
  });

  it('rifiuta nomi vuoti o solo caratteri non slug-abili', () => {
    const { result } = renderHook(() => useCustomPlaylists(emptyLib));
    let r1: any, r2: any;
    act(() => {
      r1 = result.current.create('   ');
      r2 = result.current.create('!!!');
    });
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
    expect(result.current.drafts).toHaveLength(0);
  });

  it('rifiuta duplicati per nome (case-insensitive)', () => {
    const { result } = renderHook(() => useCustomPlaylists(emptyLib));
    act(() => { result.current.create('Mix'); });
    let res: any;
    act(() => { res = result.current.create('mix'); });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('duplicate');
    expect(result.current.drafts).toHaveLength(1);
  });

  it("rifiuta una bozza con stesso id di una playlist del manifest", () => {
    const lib = libWith([{ id: 'mix', name: 'Mix', trackIds: [] }]);
    const { result } = renderHook(() => useCustomPlaylists(lib));
    let res: any;
    act(() => { res = result.current.create('Mix'); });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('duplicate');
  });
});

describe('useCustomPlaylists.addTrack / removeTrack', () => {
  it('aggiunge una traccia alla bozza e deduplica', () => {
    const { result } = renderHook(() => useCustomPlaylists(emptyLib));
    act(() => { result.current.create('Mix'); });
    act(() => {
      result.current.addTrack('mix', 't1');
      result.current.addTrack('mix', 't2');
      result.current.addTrack('mix', 't1'); // duplicato
    });
    expect(result.current.drafts[0].trackIds).toEqual(['t1', 't2']);
  });

  it('rimuove una traccia dalla bozza', () => {
    const { result } = renderHook(() => useCustomPlaylists(emptyLib));
    act(() => {
      result.current.create('Mix');
      result.current.addTrack('mix', 't1');
      result.current.addTrack('mix', 't2');
    });
    act(() => result.current.removeTrack('mix', 't1'));
    expect(result.current.drafts[0].trackIds).toEqual(['t2']);
  });
});

describe('useCustomPlaylists.rename / remove', () => {
  it('rinomina una bozza ma non cambia id', () => {
    const { result } = renderHook(() => useCustomPlaylists(emptyLib));
    act(() => { result.current.create('Mix'); });
    let res: any;
    act(() => { res = result.current.rename('mix', 'Mix Estivo'); });
    expect(res.ok).toBe(true);
    expect(result.current.drafts[0].name).toBe('Mix Estivo');
    expect(result.current.drafts[0].id).toBe('mix');
  });

  it('elimina una bozza', () => {
    const { result } = renderHook(() => useCustomPlaylists(emptyLib));
    act(() => {
      result.current.create('A');
      result.current.create('B');
    });
    act(() => result.current.remove('a'));
    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0].id).toBe('b');
  });
});

describe('useCustomPlaylists dedup verso il manifest', () => {
  it("rimuove la bozza quando il manifest contiene una playlist con stesso id", () => {
    const { result, rerender } = renderHook(
      ({ lib }) => useCustomPlaylists(lib),
      { initialProps: { lib: emptyLib } }
    );
    act(() => { result.current.create('Mix'); });
    expect(result.current.drafts).toHaveLength(1);

    rerender({ lib: libWith([{ id: 'mix', name: 'Mix', trackIds: ['a', 'b'] }]) });
    expect(result.current.drafts).toHaveLength(0);
    // anche il localStorage deve essere stato pulito
    const stored = JSON.parse(localStorage.getItem('own-music:drafts') || '{"drafts":[]}');
    expect(stored.drafts).toHaveLength(0);
  });

  it("rimuove la bozza quando il manifest contiene una playlist con stesso nome (id diverso)", () => {
    const { result, rerender } = renderHook(
      ({ lib }) => useCustomPlaylists(lib),
      { initialProps: { lib: emptyLib } }
    );
    act(() => { result.current.create('Mix'); });

    rerender({ lib: libWith([{ id: 'qualcosaltro', name: 'Mix', trackIds: [] }]) });
    expect(result.current.drafts).toHaveLength(0);
  });
});

describe('useCustomPlaylists persistenza', () => {
  it('persiste le bozze in localStorage con schemaVersion', () => {
    const { result } = renderHook(() => useCustomPlaylists(emptyLib));
    act(() => {
      result.current.create('Mix');
      result.current.addTrack('mix', 't1');
    });
    const stored = JSON.parse(localStorage.getItem('own-music:drafts')!);
    expect(stored.schemaVersion).toBe(1);
    expect(stored.drafts).toHaveLength(1);
    expect(stored.drafts[0].trackIds).toEqual(['t1']);
  });

  it('reidrata dal localStorage al mount', () => {
    localStorage.setItem('own-music:drafts', JSON.stringify({
      schemaVersion: 1,
      drafts: [{ id: 'pre', name: 'Pre', trackIds: ['x'], createdAt: '2026-01-01' }],
    }));
    const { result } = renderHook(() => useCustomPlaylists(emptyLib));
    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0].name).toBe('Pre');
  });

  it('ignora payload con schema diverso', () => {
    localStorage.setItem('own-music:drafts', JSON.stringify({
      schemaVersion: 999,
      drafts: [{ id: 'x', name: 'X', trackIds: [] }],
    }));
    const { result } = renderHook(() => useCustomPlaylists(emptyLib));
    expect(result.current.drafts).toHaveLength(0);
  });
});
