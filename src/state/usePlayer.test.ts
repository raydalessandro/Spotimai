import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayer } from './usePlayer';
import type { Library, Track } from '../lib/types';

const instances: FakeAudio[] = [];

class FakeAudio extends EventTarget {
  src = '';
  currentTime = 0;
  duration = 0;
  paused = true;
  preload = '';
  playCalls = 0;
  /** Se valorizzato, play() rifiuta con questo errore. */
  failWith: Error | null = null;

  constructor() {
    super();
    instances.push(this);
  }
  load() { /* no-op */ }
  removeAttribute() { /* no-op */ }
  play() {
    this.playCalls++;
    if (this.failWith) return Promise.reject(this.failWith);
    this.paused = false;
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
}

const audio = () => instances[instances.length - 1];
/** L'ultimo segmento dell'src, cioè l'id del file che sta suonando. */
const playingFile = () => audio().src.split('/').pop()?.replace('.mp3', '') ?? '';

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
    instances.length = 0;
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

  it('skipNext con repeat=off si ferma sull ultima traccia', async () => {
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

  it('skipNext con shuffle salta a un altra traccia (random deterministico)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { result } = renderHook(() => usePlayer(library));
    await act(async () => {
      result.current.playTrack('b', ['a', 'b', 'c']);
    });
    act(() => result.current.toggleShuffle());
    await act(async () => result.current.skipNext());
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

  // --- fine traccia: il bug del telefono bloccato ---

  describe('fine traccia', () => {
    it('carica la traccia dopo DENTRO l evento ended, non in un effetto', async () => {
      const { result } = renderHook(() => usePlayer(library));
      await act(async () => {
        result.current.playTrack('a', ['a', 'b', 'c']);
      });
      expect(playingFile()).toBe('a');

      let fileSubitoDopoLEvento = '';
      let playSubitoDopoLEvento = 0;
      await act(async () => {
        audio().dispatchEvent(new Event('ended'));
        // Letto qui: siamo ancora dentro act, gli effetti di React non sono
        // ancora girati. Se il file e gia cambiato, il lavoro e stato fatto
        // nello stack dell evento - che e esattamente cio che serve perche
        // funzioni a schermo bloccato.
        fileSubitoDopoLEvento = playingFile();
        playSubitoDopoLEvento = audio().playCalls;
      });

      expect(fileSubitoDopoLEvento).toBe('b');
      expect(playSubitoDopoLEvento).toBe(2);
      expect(result.current.currentTrackId).toBe('b');
    });

    it('con repeat=one rifa la stessa traccia da capo', async () => {
      const { result } = renderHook(() => usePlayer(library));
      await act(async () => {
        result.current.playTrack('a', ['a', 'b', 'c']);
      });
      act(() => { result.current.cycleRepeat(); result.current.cycleRepeat(); });
      expect(result.current.repeat).toBe('one');
      audio().currentTime = 99;
      await act(async () => { audio().dispatchEvent(new Event('ended')); });
      expect(result.current.currentTrackId).toBe('a');
      expect(audio().currentTime).toBe(0);
    });

    it('con repeat=all riparte dalla prima', async () => {
      const { result } = renderHook(() => usePlayer(library));
      await act(async () => {
        result.current.playTrack('c', ['a', 'b', 'c']);
      });
      act(() => result.current.cycleRepeat());
      await act(async () => { audio().dispatchEvent(new Event('ended')); });
      expect(result.current.currentTrackId).toBe('a');
    });

    it('a fine coda con repeat=off resta dov e', async () => {
      const { result } = renderHook(() => usePlayer(library));
      await act(async () => {
        result.current.playTrack('c', ['a', 'b', 'c']);
      });
      const primaDelFine = audio().playCalls;
      await act(async () => { audio().dispatchEvent(new Event('ended')); });
      expect(result.current.currentTrackId).toBe('c');
      expect(audio().playCalls).toBe(primaDelFine);
    });

    it('avanza anche dopo aver cambiato coda, shuffle o repeat', async () => {
      const { result } = renderHook(() => usePlayer(library));
      await act(async () => {
        result.current.playTrack('a', ['a', 'b', 'c']);
      });
      // la coda cambia sotto i piedi dei listener gia registrati
      await act(async () => {
        result.current.playTrack('c', ['c', 'a']);
      });
      await act(async () => { audio().dispatchEvent(new Event('ended')); });
      expect(result.current.currentTrackId).toBe('a');
    });
  });

  // --- file rotto ---

  describe('file illeggibile', () => {
    it('passa alla traccia dopo invece di piantarsi', async () => {
      const { result } = renderHook(() => usePlayer(library));
      await act(async () => {
        result.current.playTrack('a', ['a', 'b', 'c']);
      });
      await act(async () => { audio().dispatchEvent(new Event('error')); });
      expect(result.current.currentTrackId).toBe('b');
    });

    it('se sono rotti tutti si ferma invece di girare all infinito', async () => {
      const { result } = renderHook(() => usePlayer(library));
      await act(async () => {
        result.current.playTrack('a', ['a', 'b', 'c']);
      });
      // ogni errore fa avanzare, ma dopo un giro di coda deve arrendersi
      for (let i = 0; i < 10; i++) {
        await act(async () => { audio().dispatchEvent(new Event('error')); });
      }
      expect(result.current.isPlaying).toBe(false);
      expect(audio().playCalls).toBeLessThanOrEqual(library.tracks.length + 1);
    });
  });

  // --- lockscreen ---

  describe('controlli da lockscreen', () => {
    const handlers: Record<string, ((d?: { seekTime?: number }) => void) | null> = {};

    beforeEach(() => {
      for (const k of Object.keys(handlers)) delete handlers[k];
      Object.defineProperty(navigator, 'mediaSession', {
        configurable: true,
        writable: true,
        value: {
          metadata: null,
          playbackState: 'none',
          setActionHandler: (a: string, h: never) => { handlers[a] = h; },
          setPositionState: () => {},
        },
      });
      vi.stubGlobal('MediaMetadata', class { constructor(o: object) { Object.assign(this, o); } });
    });

    it('il tasto avanti usa repeat aggiornato, non quello di quando si e registrato', async () => {
      const { result } = renderHook(() => usePlayer(library));
      await act(async () => {
        result.current.playTrack('c', ['a', 'b', 'c']);
      });
      // repeat cambia SENZA che cambi la traccia: prima i gestori del
      // lockscreen restavano con i valori vecchi in closure.
      act(() => result.current.cycleRepeat());
      expect(result.current.repeat).toBe('all');

      await act(async () => { handlers.nexttrack?.(); });
      expect(result.current.currentTrackId).toBe('a');
    });

    it('il tasto avanti usa la coda aggiornata', async () => {
      const { result } = renderHook(() => usePlayer(library));
      await act(async () => {
        result.current.playTrack('a', ['a', 'b']);
      });
      await act(async () => {
        result.current.playTrack('c', ['c', 'b', 'a']);
      });
      await act(async () => { handlers.nexttrack?.(); });
      expect(result.current.currentTrackId).toBe('b');
    });

    it('seekto sposta la riproduzione', async () => {
      const { result } = renderHook(() => usePlayer(library));
      await act(async () => {
        result.current.playTrack('a', ['a', 'b', 'c']);
      });
      await act(async () => { handlers.seekto?.({ seekTime: 42 }); });
      expect(audio().currentTime).toBe(42);
      expect(result.current.progress).toBe(42);
    });

    it('aggiorna playbackState per l icona play/pausa del lockscreen', async () => {
      const { result } = renderHook(() => usePlayer(library));
      await act(async () => {
        result.current.playTrack('a', ['a', 'b', 'c']);
      });
      expect(navigator.mediaSession.playbackState).toBe('playing');
      await act(async () => { audio().pause(); });
      expect(navigator.mediaSession.playbackState).toBe('paused');
    });
  });

  // --- altri difetti ---

  describe('cronologia', () => {
    it('segnala anche le tracce partite da sole a fine della precedente', async () => {
      const partite: string[] = [];
      const { result } = renderHook(() => usePlayer(library, id => { partite.push(id); }));
      await act(async () => {
        result.current.playTrack('a', ['a', 'b', 'c']);
      });
      await act(async () => { audio().dispatchEvent(new Event('ended')); });
      await act(async () => { audio().dispatchEvent(new Event('ended')); });
      expect(partite).toEqual(['a', 'b', 'c']);
    });

    it('con repeat=one non risegnala la stessa traccia a ogni giro', async () => {
      const partite: string[] = [];
      const { result } = renderHook(() => usePlayer(library, id => { partite.push(id); }));
      await act(async () => {
        result.current.playTrack('a', ['a', 'b', 'c']);
      });
      act(() => { result.current.cycleRepeat(); result.current.cycleRepeat(); });
      await act(async () => { audio().dispatchEvent(new Event('ended')); });
      await act(async () => { audio().dispatchEvent(new Event('ended')); });
      expect(partite).toEqual(['a']);
    });
  });

  it('rimettere la traccia gia in riproduzione la fa ripartire', async () => {
    const { result } = renderHook(() => usePlayer(library));
    await act(async () => {
      result.current.playTrack('a', ['a', 'b', 'c']);
    });
    audio().currentTime = 50;
    const prima = audio().playCalls;
    await act(async () => {
      result.current.playTrack('a', ['a', 'b', 'c']);
    });
    expect(audio().playCalls).toBe(prima + 1);
    expect(result.current.progress).toBe(0);
  });

  it('uno skip rapido non lascia la UI in pausa', async () => {
    const { result } = renderHook(() => usePlayer(library));
    await act(async () => {
      result.current.playTrack('a', ['a', 'b', 'c']);
    });
    expect(result.current.isPlaying).toBe(true);
    // il browser annulla la play() precedente quando l src cambia subito
    audio().failWith = Object.assign(new Error('interrotta'), { name: 'AbortError' });
    await act(async () => result.current.skipNext());
    expect(result.current.isPlaying).toBe(true);
  });

  it('con shuffle non ripesca la traccia corrente e le altre sono equiprobabili', async () => {
    const { result } = renderHook(() => usePlayer(library));
    await act(async () => {
      result.current.playTrack('a', ['a', 'b', 'c']);
    });
    act(() => result.current.toggleShuffle());

    const conteggi: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 100; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(i / 100);
      await act(async () => {
        result.current.playTrack('a', ['a', 'b', 'c']);
        result.current.skipNext();
      });
      conteggi[result.current.currentTrackId!]++;
    }
    expect(conteggi.a).toBe(0);
    expect(conteggi.b).toBe(50);
    expect(conteggi.c).toBe(50);
  });
});
