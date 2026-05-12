import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Heart, ChevronDown, ListPlus } from 'lucide-react';
import type { Track, RepeatMode } from '../lib/types';
import { fmtTime, gradientFor } from '../lib/utils';
import Cover from './Cover';

type Props = {
  track: Track;
  isPlaying: boolean;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  isFav: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onSkipNext: () => void;
  onSkipPrev: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleFav: () => void;
  onSeek: (time: number) => void;
  onAddToPlaylist: () => void;
};

export default function FullPlayer({ track, isPlaying, progress, duration, shuffle, repeat, isFav, onClose, onTogglePlay, onSkipNext, onSkipPrev, onToggleShuffle, onCycleRepeat, onToggleFav, onSeek, onAddToPlaylist }: Props) {
  const totalSec = duration > 0 ? duration : track.duration;
  const pct = totalSec > 0 ? (progress / totalSec) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    onSeek(ratio * totalSec);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col animate-slide-up">
      <div className="absolute inset-0 opacity-30" style={{ background: gradientFor(track.album) }}></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/60 to-zinc-950"></div>
      <div className="relative flex-1 flex flex-col p-6 md:p-10 max-w-2xl mx-auto w-full">
        <header className="flex items-center justify-between mb-8">
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 p-2"><ChevronDown size={20} strokeWidth={1.5} /></button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-mono">in riproduzione</p>
            <p className="text-xs text-zinc-400 mt-0.5">{track.album}</p>
          </div>
          <button onClick={onAddToPlaylist} aria-label="Aggiungi a playlist" className="text-zinc-400 hover:text-zinc-100 p-2"><ListPlus size={20} strokeWidth={1.5} /></button>
        </header>

        <div className="flex-1 flex items-center justify-center my-4">
          <div className="w-full max-w-sm aspect-square">
            <Cover seed={track.album} label={track.album} size="xl" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-serif text-zinc-100 truncate">{track.title}</h2>
              <p className="text-sm text-zinc-400 truncate">{track.artist}</p>
            </div>
            <button onClick={onToggleFav} className={`p-2 transition ${isFav ? 'text-rose-400' : 'text-zinc-500 hover:text-zinc-200'}`}>
              <Heart size={22} strokeWidth={1.5} fill={isFav ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div>
            <div
              role="slider"
              tabIndex={0}
              aria-valuemin={0}
              aria-valuemax={totalSec}
              aria-valuenow={progress}
              onClick={handleSeek}
              className="h-2 bg-zinc-800 rounded-full overflow-hidden cursor-pointer group/seek"
            >
              <div className="h-full bg-zinc-200 transition-all" style={{ width: `${pct}%` }}></div>
            </div>
            <div className="flex justify-between mt-2 text-xs font-mono text-zinc-500">
              <span>{fmtTime(progress)}</span>
              <span>-{fmtTime(Math.max(0, totalSec - progress))}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={onToggleShuffle} className={`p-2 transition ${shuffle ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200'}`}>
              <Shuffle size={18} strokeWidth={1.5} />
            </button>
            <div className="flex items-center gap-6">
              <button onClick={onSkipPrev} className="text-zinc-300 hover:text-zinc-100 p-2"><SkipBack size={26} fill="currentColor" /></button>
              <button onClick={onTogglePlay} className="w-16 h-16 bg-zinc-100 hover:bg-white text-zinc-900 rounded-full flex items-center justify-center transition shadow-xl">
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>
              <button onClick={onSkipNext} className="text-zinc-300 hover:text-zinc-100 p-2"><SkipForward size={26} fill="currentColor" /></button>
            </div>
            <button onClick={onCycleRepeat} className={`relative p-2 transition ${repeat !== 'off' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200'}`}>
              <Repeat size={18} strokeWidth={1.5} />
              {repeat === 'one' && <span className="absolute -top-0.5 -right-0.5 text-[8px] font-mono bg-emerald-400 text-zinc-950 rounded-full w-3 h-3 flex items-center justify-center">1</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
