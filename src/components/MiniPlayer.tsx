import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import type { Track } from '../lib/types';
import Cover from './Cover';

type Props = {
  track: Track;
  isPlaying: boolean;
  progress: number;
  duration: number;
  onExpand: () => void;
  onTogglePlay: () => void;
  onSkipNext: () => void;
  onSkipPrev: () => void;
};

export default function MiniPlayer({ track, isPlaying, progress, duration, onExpand, onTogglePlay, onSkipNext, onSkipPrev }: Props) {
  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  return (
    <div className="fixed bottom-16 md:bottom-4 left-2 right-2 md:left-64 md:right-4 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-40 flex items-center gap-3 p-2">
      <button
        type="button"
        onClick={onExpand}
        className="flex-1 flex items-center gap-3 min-w-0 text-left hover:bg-zinc-800/50 rounded-md p-1 -m-1 transition"
      >
        <Cover seed={track.album} label={track.album} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-100 font-medium truncate">{track.title}</p>
          <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
          <div className="h-0.5 bg-zinc-800 mt-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-400" style={{ width: `${pct}%` }}></div>
          </div>
        </div>
      </button>
      <div className="flex items-center gap-1 pr-1">
        <button type="button" onClick={onSkipPrev} className="p-2 text-zinc-400 hover:text-zinc-100"><SkipBack size={16} fill="currentColor" /></button>
        <button type="button" onClick={onTogglePlay} className="p-2 text-zinc-100">
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <button type="button" onClick={onSkipNext} className="p-2 text-zinc-400 hover:text-zinc-100"><SkipForward size={16} fill="currentColor" /></button>
      </div>
    </div>
  );
}
