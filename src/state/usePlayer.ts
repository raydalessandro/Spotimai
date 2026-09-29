import { useEffect, useRef, useState, useCallback } from 'react';
import type { Track, RepeatMode, Library } from '../lib/types';
import { audioUrl, trackById } from '../lib/library';

export type PlayerState = {
  currentTrack: Track | null;
  queue: string[];
  isPlaying: boolean;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
};

const MEDIA_ACTIONS = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto'] as const;

/**
 * @param onTrackStart chiamato ogni volta che parte una traccia, anche quando
 *   parte da sola a fine della precedente. Serve alla cronologia: prima veniva
 *   alimentata solo dal tap dell'utente, quindi un album ascoltato di fila
 *   finiva in `Ultime riprodotte` con la sola traccia da cui si era partiti.
 */
export function usePlayer(library: Library | null, onTrackStart?: (trackId: string) => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');

  const currentTrack = library && currentTrackId ? trackById(library, currentTrackId) ?? null : null;

  // Specchio in ref di tutto quello che serve dentro i listener dell'audio.
  // I listener sono registrati una volta sola e leggono da qui, mai da una
  // closure vecchia: senza questo, cambiare coda/shuffle/repeat senza cambiare
  // traccia lasciava i tasti del lockscreen a ragionare sui dati di prima.
  const libraryRef = useRef(library);
  const queueRef = useRef(queue);
  const shuffleRef = useRef(shuffle);
  const repeatRef = useRef(repeat);
  const currentIdRef = useRef<string | null>(currentTrackId);
  // Quanti file di fila non sono partiti: evita di rimbalzare all'infinito
  // su una coda di file tutti rotti.
  const failuresRef = useRef(0);
  const onTrackStartRef = useRef(onTrackStart);

  /** Carica e fa partire una traccia. Sincrono di proposito: vedi onEnded. */
  const playId = useCallback((id: string) => {
    const audio = audioRef.current;
    const lib = libraryRef.current;
    if (!audio || !lib) return;
    const track = trackById(lib, id);
    if (!track) return;

    currentIdRef.current = id;
    setCurrentTrackId(id);
    setProgress(0);
    onTrackStartRef.current?.(id);

    audio.src = audioUrl(track);
    if (typeof audio.load === 'function') audio.load();
    const started = audio.play();
    if (started && typeof started.catch === 'function') {
      started.catch((err: unknown) => {
        // AbortError = un'altra traccia ha preso il posto di questa prima che
        // partisse (skip rapidi). Non e uno stop: lasciare isPlaying com'e,
        // altrimenti la UI lampeggia su "in pausa" mentre sta per suonare.
        if (err instanceof Error && err.name === 'AbortError') return;
        setIsPlaying(false);
      });
    }
  }, []);

  /** Prossimo id secondo coda, shuffle e repeat. null se la coda e finita. */
  const nextIdFrom = useCallback((fromId: string | null): string | null => {
    const q = queueRef.current;
    if (!fromId || q.length === 0) return null;
    const idx = q.indexOf(fromId);
    if (idx < 0) return null;

    if (shuffleRef.current && q.length > 1) {
      // Pesca uniformemente fra le ALTRE tracce. La vecchia versione, quando
      // usciva la traccia corrente, prendeva la successiva: cosi quella aveva
      // il doppio delle probabilita delle altre.
      let r = Math.floor(Math.random() * (q.length - 1));
      if (r >= idx) r++;
      return q[r] ?? null;
    }

    const next = q[idx + 1];
    if (next) return next;
    if (repeatRef.current === 'all') return q[0] ?? null;
    return null;
  }, []);

  // I listener sono registrati una volta sola al mount, quindi devono poter
  // chiamare queste due funzioni senza catturarle in una closure che invecchia.
  const playIdRef = useRef(playId);
  const nextIdFromRef = useRef(nextIdFrom);

  // Un solo effetto che riallinea tutte le ref dopo ogni render.
  useEffect(() => {
    libraryRef.current = library;
    queueRef.current = queue;
    shuffleRef.current = shuffle;
    repeatRef.current = repeat;
    currentIdRef.current = currentTrackId;
    playIdRef.current = playId;
    nextIdFromRef.current = nextIdFrom;
    onTrackStartRef.current = onTrackStart;
  });

  // Audio element: creato una volta sola, listener registrati una volta sola.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onPlaying = () => { failuresRef.current = 0; };

    // Il passaggio alla traccia dopo avviene QUI, dentro l'evento, non in un
    // useEffect dopo un setState. Se lo si fa via stato, la play() parte fuori
    // dallo stack di 'ended': a telefono bloccato il browser la tratta come un
    // autoplay nuovo e la rifiuta, e intanto lo scheduler di React e rallentato
    // perche la pagina e in background. Risultato: la canzone finiva e li
    // restava. Dentro l'evento invece e continuazione di una riproduzione gia
    // in corso, e passa.
    const onEnded = () => {
      if (repeatRef.current === 'one') {
        audio.currentTime = 0;
        const again = audio.play();
        if (again && typeof again.catch === 'function') again.catch(() => {});
        return;
      }
      const next = nextIdFromRef.current(currentIdRef.current);
      if (next) playIdRef.current(next);
    };

    // File mancante o illeggibile: si va avanti invece di piantarsi, ma senza
    // rimbalzare all'infinito se sono rotti tutti.
    const onError = () => {
      failuresRef.current += 1;
      if (failuresRef.current > queueRef.current.length) {
        setIsPlaying(false);
        return;
      }
      const next = nextIdFromRef.current(currentIdRef.current);
      if (next) playIdRef.current(next);
      else setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      // src = '' farebbe ricaricare al browser l'URL della pagina stessa.
      if (typeof audio.removeAttribute === 'function') audio.removeAttribute('src');
    };
  }, []);

  const playTrack = useCallback((trackId: string, contextIds?: string[]) => {
    const q = contextIds && contextIds.length > 0 ? contextIds : [trackId];
    // Anche subito in ref: se arriva un "next" dal lockscreen prima che React
    // abbia riconciliato, la coda nuova deve essere gia quella giusta.
    queueRef.current = q;
    setQueue(q);
    failuresRef.current = 0;
    // Nessuna scorciatoia se l'id e lo stesso: prima, ritoccare la traccia in
    // riproduzione non faceva nulla, perche lo stato non cambiava e l'effetto
    // che caricava l'audio non rigirava.
    playIdRef.current(trackId);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      const started = audio.play();
      if (started && typeof started.catch === 'function') started.catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const skipNext = useCallback(() => {
    const next = nextIdFromRef.current(currentIdRef.current);
    if (next) playIdRef.current(next);
  }, []);

  const skipPrev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setProgress(0);
      return;
    }
    const q = queueRef.current;
    const cur = currentIdRef.current;
    if (!cur) return;
    const idx = q.indexOf(cur);
    const prevId = idx > 0 ? q[idx - 1] : undefined;
    if (prevId) playIdRef.current(prevId);
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setProgress(time);
  }, []);

  const toggleShuffle = useCallback(() => setShuffle(s => !s), []);
  const cycleRepeat = useCallback(() =>
    setRepeat(r => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'), []);

  // Media Session: i gestori si registrano una volta sola e leggono dalle ref.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    try {
      ms.setActionHandler('play', () => {
        const started = audioRef.current?.play();
        if (started && typeof started.catch === 'function') started.catch(() => {});
      });
      ms.setActionHandler('pause', () => audioRef.current?.pause());
      ms.setActionHandler('previoustrack', () => skipPrev());
      ms.setActionHandler('nexttrack', () => skipNext());
      ms.setActionHandler('seekto', (details) => {
        const audio = audioRef.current;
        if (!audio || typeof details.seekTime !== 'number') return;
        audio.currentTime = details.seekTime;
        setProgress(details.seekTime);
      });
    } catch { /* azione non supportata dal browser */ }
    return () => {
      try {
        for (const action of MEDIA_ACTIONS) ms.setActionHandler(action, null);
      } catch { /* idem */ }
    };
  }, [skipNext, skipPrev]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!currentTrack || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
    });
  }, [currentTrack]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Senza questo la barra sul lockscreen resta ferma a zero.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    if (typeof ms.setPositionState !== 'function') return;
    if (!duration || !Number.isFinite(duration)) return;
    try {
      ms.setPositionState({
        duration,
        position: Math.max(0, Math.min(progress, duration)),
        playbackRate: 1,
      });
    } catch { /* posizione incoerente durante un cambio traccia */ }
  }, [duration, progress]);

  return {
    currentTrack,
    currentTrackId,
    queue,
    isPlaying,
    progress,
    duration,
    shuffle,
    repeat,
    playTrack,
    togglePlay,
    skipNext,
    skipPrev,
    seek,
    toggleShuffle,
    cycleRepeat,
  };
}
