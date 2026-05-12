import { Play, Heart, ListPlus } from 'lucide-react';
import type { Track } from '../lib/types';
import { fmtTime } from '../lib/utils';
import Cover from './Cover';

type Props = {
  track: Track;
  index?: number;
  onPlay: () => void;
  isPlaying?: boolean;
  isFav?: boolean;
  onToggleFav?: () => void;
  onAddToPlaylist?: () => void;
};

export default function TrackRow({ track, index, onPlay, isPlaying, isFav, onToggleFav, onAddToPlaylist }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPlay}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlay(); } }}
      className={`group grid grid-cols-[2rem_1fr_auto] gap-3 items-center p-2 rounded-md hover:bg-zinc-900/70 active:bg-zinc-900 cursor-pointer transition select-none ${isPlaying ? 'bg-zinc-900/50' : ''}`}
    >
      <div className="w-8 h-8 flex items-center justify-center text-zinc-500 group-hover:text-zinc-200 pointer-events-none">
        {isPlaying ? (
          <div className="flex gap-0.5 items-end h-3">
            <span className="w-0.5 bg-emerald-400 animate-pulse-bar" style={{ height: '60%', animationDelay: '0ms' }}></span>
            <span className="w-0.5 bg-emerald-400 animate-pulse-bar" style={{ height: '100%', animationDelay: '150ms' }}></span>
            <span className="w-0.5 bg-emerald-400 animate-pulse-bar" style={{ height: '40%', animationDelay: '300ms' }}></span>
          </div>
        ) : (
          <>
            <span className="group-hover:hidden text-xs font-mono">{index ?? '·'}</span>
            <Play size={12} fill="currentColor" className="hidden group-hover:block" />
          </>
        )}
      </div>
      <div className="flex items-center gap-3 min-w-0 pointer-events-none">
        <Cover seed={track.album} label={track.album} size="sm" />
        <div className="min-w-0">
          <p className={`text-sm truncate ${isPlaying ? 'text-emerald-400' : 'text-zinc-200'}`}>{track.title}</p>
          <p className="text-xs text-zinc-500 truncate">{track.artist} · {track.album}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-zinc-500">
        {onAddToPlaylist && (
          <button
            type="button"
            aria-label="Aggiungi a playlist"
            onClick={(e) => { e.stopPropagation(); onAddToPlaylist(); }}
            className="p-1 md:opacity-0 md:group-hover:opacity-100 transition hover:text-zinc-200"
          >
            <ListPlus size={14} />
          </button>
        )}
        {onToggleFav && (
          <button
            type="button"
            aria-label={isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
            onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
            className={`p-1 md:opacity-0 md:group-hover:opacity-100 transition ${isFav ? '!opacity-100 text-rose-400' : 'hover:text-zinc-200'}`}
          >
            <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
          </button>
        )}
        <span className="text-xs font-mono pointer-events-none">{fmtTime(track.duration)}</span>
      </div>
    </div>
  );
}
