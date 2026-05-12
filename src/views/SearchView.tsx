import { useState } from 'react';
import { Search } from 'lucide-react';
import TrackRow from '../components/TrackRow';
import type { ViewProps } from './_shared';

export default function SearchView({ library, onPlay, currentTrackId, isPlaying, favorites, toggleFav, openAddToPlaylist }: ViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const q = searchQuery.toLowerCase().trim();
  const results = q ? library.tracks.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.artist.toLowerCase().includes(q) ||
    t.album.toLowerCase().includes(q) ||
    t.genre.toLowerCase().includes(q)
  ) : [];
  const resultIds = results.map(r => r.id);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-serif font-light text-zinc-100 mb-4">Cerca</h1>
        <div className="relative">
          <Search size={16} strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Titoli, artisti, album, generi…"
            className="w-full bg-zinc-900/70 border border-zinc-800 focus:border-zinc-600 rounded-md pl-11 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition"
          />
        </div>
      </header>
      {q && (
        <div>
          <p className="text-xs text-zinc-500 font-mono mb-3">{results.length} risultati</p>
          <div className="space-y-1">
            {results.map(t => (
              <TrackRow
                key={t.id}
                track={t}
                onPlay={() => onPlay(t.id, resultIds)}
                isPlaying={currentTrackId === t.id && isPlaying}
                isFav={favorites.has(t.id)}
                onToggleFav={() => toggleFav(t.id)}
                onAddToPlaylist={() => openAddToPlaylist(t.id)}
              />
            ))}
          </div>
        </div>
      )}
      {!q && (
        <div className="mt-12 text-center text-zinc-600">
          <Search size={32} strokeWidth={1} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm font-mono">cerca nella tua libreria</p>
        </div>
      )}
    </div>
  );
}
