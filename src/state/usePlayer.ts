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

export function usePlayer(library: Library | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');

  const currentTrack = library && currentTrackId ? trackById(library, currentTrackId) ?? null : null;

  // Inizializza audio element una sola volta
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      // gestito da useEffect su currentTrackId/repeat sotto
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Quando cambia traccia, carica e parte
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    audio.src = audioUrl(currentTrack);
    audio.currentTime = 0;
    setProgress(0);
    audio.play().catch(err => {
      console.warn('Autoplay bloccato:', err);
      setIsPlaying(false);
    });
  }, [currentTrack]);

  // Media Session API per controlli da lockscreen/notifiche
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
    });
    navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play());
    navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => skipPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => skipNext());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  const playTrack = useCallback((trackId: string, contextIds?: string[]) => {
    setQueue(contextIds || [trackId]);
    setCurrentTrackId(trackId);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const skipNext = useCallback(() => {
    setCurrentTrackId(prev => {
      if (!prev) return prev;
      const idx = queue.indexOf(prev);
      if (idx < 0) return prev;
      // shuffle
      if (shuffle && queue.length > 1) {
        let nextIdx = Math.floor(Math.random() * queue.length);
        if (nextIdx === idx) nextIdx = (nextIdx + 1) % queue.length;
        return queue[nextIdx];
      }
      const next = queue[idx + 1];
      if (next) return next;
      if (repeat === 'all') return queue[0];
      return prev;
    });
  }, [queue, shuffle, repeat]);

  const skipPrev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setProgress(0);
      return;
    }
    setCurrentTrackId(prev => {
      if (!prev) return prev;
      const idx = queue.indexOf(prev);
      const prevId = queue[idx - 1];
      return prevId ?? prev;
    });
  }, [queue]);

  // Gestione end → next / repeat
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      skipNext();
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [repeat, skipNext]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setProgress(time);
  }, []);

  const toggleShuffle = useCallback(() => setShuffle(s => !s), []);
  const cycleRepeat = useCallback(() =>
    setRepeat(r => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'), []);

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
