import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayer } from './usePlayer';
import type { Library, Track } from '../lib/types';

class FakeAudio extends EventTarget {
  src = '';
  currentTime = 0;
  duration = 0;
  paused = true;
  preload = '';
  play() {
    this.paused = false;
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
}

const mkTrack = (id: string, dur = 100): Track => ({
  id,
  title: id.toUpperCase(),
  artist: 'X',
  album: 'A',
  genre: 'G',
  duration: dur,
  path: `g/x/a/${id}.mp3`,
});

const library: Library = {
  schemaVersion: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  tracks: [mkTrack('a'), mkTrack('b'), mkTrack('c')],
  autoPlaylists: { byGenre: {}, byArtist: {}, byAlbum: {} },
  customPlaylists: [],
};

describe('usePlayer', () => {
  beforeEach(() => {
    vi.stubGlobal('Audio', FakeAudio);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('parte senza traccia corrente', () => {
    const { result } = renderHook(() => usePlayer(library));
    expect(result.current.currentTrackId).toBeNull();
    expect(result.current.currentTrack).toBeNull();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.repeat).toBe('off');
    expect(result.current.shuffle).toBe(false);
  });

  it('playTrack imposta la traccia corrente e popola la queue', async () => {
    const { result } = renderHook(() => usePlayer(library));
    await act(async () => {
      result.current.playTrack('a', ['a', 'b', 'c']);
    });
    expect(result.current.currentTrackId).toBe('a');
    expect(result.current.currentTrack?.id).toBe('a');
    expect(result.current.queue).toEqual(['a', 'b', 'c']);
  });

  it('skipNext avanza nella queue', async () => {
    const { result } = renderHook(() => usePlayer(library));
    await act(async () => {
      result.current.playTrack('a', ['a', 'b', 'c']);
    });
    await act(async () => result.current.skipNext());
    expect(result.current.currentTrackId).toBe('b');
    await act(async () => result.current.skipNext());
    expect(result.current.currentTrackId).toBe('c');
  });

  it('skipNext con repeat=off si ferma sull’ultima traccia', async () => {
    const { result } = renderHook(() => usePlayer(library));
    await act(async () => {
      result.current.playTrack('c', ['a', 'b', 'c']);
    });
    await act(async () => result.current.skipNext());
    expect(result.current.currentTrackId).toBe('c');
  });

  it('skipNext con repeat=all torna alla prima', async () => {
    const { result } = renderHook(() => usePlayer(library));
    await act(async () => {
      result.current.playTrack('c', ['a', 'b', 'c']);
    });
    act(() => result.current.cycleRepeat()); // off -> all
    expect(result.current.repeat).toBe('all');
    await act(async () => result.current.skipNext());
    expect(result.current.currentTrackId).toBe('a');
  });

  it('cycleRepeat cicla off -> all -> one -> off', () => {
    const { result } = renderHook(() => usePlayer(library));
    expect(result.current.repeat).toBe('off');
    act(() => result.current.cycleRepeat());
    expect(result.current.repeat).toBe('all');
    act(() => result.current.cycleRepeat());
    expect(result.current.repeat).toBe('one');
    act(() => result.current.cycleRepeat());
    expect(result.current.repeat).toBe('off');
  });

  it('toggleShuffle inverte lo stato', () => {
    const { result } = renderHook(() => usePlayer(library));
    act(() => result.current.toggleShuffle());
    expect(result.current.shuffle).toBe(true);
    act(() => result.current.toggleShuffle());
    expect(result.current.shuffle).toBe(false);
  });

  it('skipNext con shuffle salta a un’altra traccia (random deterministico)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // → primo elemento
    const { result } = renderHook(() => usePlayer(library));
    await act(async () => {
      result.current.playTrack('b', ['a', 'b', 'c']);
    });
    act(() => result.current.toggleShuffle());
    await act(async () => result.current.skipNext());
    // con random=0 punterebbe a 'a' (idx 0). Se coincide con prev (idx 1 != 0), tiene 'a'.
    expect(result.current.currentTrackId).toBe('a');
  });

  it('skipPrev torna indietro nella queue', async () => {
    const { result } = renderHook(() => usePlayer(library));
    await act(async () => {
      result.current.playTrack('b', ['a', 'b', 'c']);
    });
    await act(async () => result.current.skipPrev());
    expect(result.current.currentTrackId).toBe('a');
  });
});
