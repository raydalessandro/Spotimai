import { Play, Shuffle } from 'lucide-react';
import Cover from '../components/Cover';
import TrackRow from '../components/TrackRow';
import { trackById } from '../lib/library';
import type { ViewProps } from './_shared';

type Props = ViewProps & {
  title: string;
  subtitle?: string;
  trackIds: string[];
  seed: string;
  kind2?: string;
};

export default function ListView({ library, title, subtitle, trackIds, seed, kind2, onPlay, currentTrackId, isPlaying, favorites, toggleFav, goBack, openAddToPlaylist }: Props) {
  const tracks = trackIds.map(id => trackById(library, id)).filter((t): t is NonNullable<typeof t> => !!t);
  const totalSec = tracks.reduce((s, t) => s + t.duration, 0);

  return (
    <div>
      <button onClick={goBack} className="text-xs text-zinc-500 hover:text-zinc-300 mb-4 font-mono">← indietro</button>
      <header className="flex flex-col md:flex-row md:items-end gap-6 mb-8">
        <div className="w-44 h-44 shrink-0">
          <Cover seed={seed} label={title} size="xl" rounded={kind2 === 'artist' ? 'full' : 'md'} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-mono mb-2">{kind2}</p>
          <h1 className="text-5xl font-serif font-light text-zinc-100 mb-3">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-400">{subtitle}</p>}
          <p className="text-xs text-zinc-500 mt-1 font-mono">{tracks.length} tracce · {Math.floor(totalSec / 60)} min</p>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => trackIds[0] && onPlay(trackIds[0], trackIds)}
              className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 px-5 py-2 rounded-full text-sm font-medium transition"
            >
              <Play size={14} fill="currentColor" /> Riproduci
            </button>
            <button
              onClick={() => {
                const idx = Math.floor(Math.random() * trackIds.length);
                if (trackIds[idx]) onPlay(trackIds[idx], trackIds);
              }}
              className="flex items-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 px-4 py-2 rounded-full text-sm transition"
            >
              <Shuffle size={14} /> Casuale
            </button>
          </div>
        </div>
      </header>
      <div className="space-y-0.5">
        <div className="grid grid-cols-[2rem_1fr_auto] gap-3 px-2 py-2 text-xs text-zinc-600 uppercase tracking-wider font-mono border-b border-zinc-800/50 mb-1">
          <span>#</span><span>Titolo</span><span>Durata</span>
        </div>
        {tracks.map((t, i) => (
          <TrackRow
            key={t.id}
            track={t}
            index={i + 1}
            onPlay={() => onPlay(t.id, trackIds)}
            isPlaying={currentTrackId === t.id && isPlaying}
            isFav={favorites.has(t.id)}
            onToggleFav={() => toggleFav(t.id)}
            onAddToPlaylist={() => openAddToPlaylist(t.id)}
          />
        ))}
      </div>
    </div>
  );
}
