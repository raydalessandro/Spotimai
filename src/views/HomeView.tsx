import { Plus, Tag, Mic2, Disc3 } from 'lucide-react';
import Cover from '../components/Cover';
import TrackRow from '../components/TrackRow';
import Logo from '../components/Logo';
import type { ViewProps } from './_shared';

export default function HomeView({ library, onPlay, currentTrackId, isPlaying, favorites, toggleFav, navigate, openCreatePlaylist, openAddToPlaylist }: ViewProps) {
  const recents = library.tracks.slice(0, 5);
  const recentIds = recents.map(t => t.id);
  const numGenres = Object.keys(library.autoPlaylists.byGenre).length;
  const numArtists = Object.keys(library.autoPlaylists.byArtist).length;
  const numAlbums = Object.keys(library.autoPlaylists.byAlbum).length;

  return (
    <div className="space-y-10">
      <header className="pt-2">
        <div className="flex items-center gap-2 mb-1">
          <Logo size={24} className="text-emerald-400" />
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-mono">EAR LAB</p>
        </div>
        <h1 className="text-4xl font-serif font-light text-zinc-100">own·music</h1>
      </header>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-serif text-zinc-200">Le tue playlist</h2>
          <button onClick={() => navigate({ kind: 'playlists' })} className="text-xs text-zinc-500 hover:text-zinc-300 transition">vedi tutte →</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {library.customPlaylists.length === 0 && (
            <p className="text-xs text-zinc-600 col-span-full font-mono">nessuna playlist · creane una qui sotto</p>
          )}
          {library.customPlaylists.map(pl => (
            <button
              key={pl.id}
              onClick={() => navigate({ kind: 'list', title: pl.name, subtitle: `${pl.trackIds.length} tracce`, trackIds: pl.trackIds, seed: pl.id, kind2: 'playlist' })}
              className="flex items-center gap-3 bg-zinc-900/50 hover:bg-zinc-800/80 rounded-md overflow-hidden transition border border-zinc-800/50 text-left"
            >
              <Cover seed={pl.id} label={pl.name} size="lg" />
              <div className="min-w-0 pr-3">
                <p className="text-sm text-zinc-200 font-medium truncate">{pl.name}</p>
                <p className="text-xs text-zinc-500 truncate">{pl.trackIds.length} tracce</p>
              </div>
            </button>
          ))}
          <button
            onClick={openCreatePlaylist}
            className="flex items-center gap-3 bg-transparent hover:bg-zinc-900/50 rounded-md overflow-hidden transition border border-dashed border-zinc-800 text-left"
          >
            <div className="w-16 h-16 flex items-center justify-center text-zinc-600 shrink-0">
              <Plus size={20} strokeWidth={1.5} />
            </div>
            <div className="min-w-0 pr-3">
              <p className="text-sm text-zinc-400 font-medium">Nuova playlist</p>
            </div>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-serif text-zinc-200 mb-4">Sfoglia</h2>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => navigate({ kind: 'browse', type: 'genre' })} className="bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800/50 rounded-md p-4 transition text-left">
            <Tag size={18} strokeWidth={1.5} className="text-zinc-500 mb-3" />
            <p className="text-sm font-medium text-zinc-200">Generi</p>
            <p className="text-xs text-zinc-500 mt-0.5">{numGenres}</p>
          </button>
          <button onClick={() => navigate({ kind: 'browse', type: 'artist' })} className="bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800/50 rounded-md p-4 transition text-left">
            <Mic2 size={18} strokeWidth={1.5} className="text-zinc-500 mb-3" />
            <p className="text-sm font-medium text-zinc-200">Artisti</p>
            <p className="text-xs text-zinc-500 mt-0.5">{numArtists}</p>
          </button>
          <button onClick={() => navigate({ kind: 'browse', type: 'album' })} className="bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800/50 rounded-md p-4 transition text-left">
            <Disc3 size={18} strokeWidth={1.5} className="text-zinc-500 mb-3" />
            <p className="text-sm font-medium text-zinc-200">Album</p>
            <p className="text-xs text-zinc-500 mt-0.5">{numAlbums}</p>
          </button>
        </div>
      </section>

      {recents.length > 0 && (
        <section>
          <h2 className="text-lg font-serif text-zinc-200 mb-4">Tutte le tracce</h2>
          <div className="space-y-1">
            {recents.map(t => (
              <TrackRow
                key={t.id}
                track={t}
                onPlay={() => onPlay(t.id, recentIds)}
                isPlaying={currentTrackId === t.id && isPlaying}
                isFav={favorites.has(t.id)}
                onToggleFav={() => toggleFav(t.id)}
                onAddToPlaylist={() => openAddToPlaylist(t.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
