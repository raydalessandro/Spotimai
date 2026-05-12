import { Plus } from 'lucide-react';
import Cover from '../components/Cover';
import type { ViewProps } from './_shared';

export default function PlaylistsView({ library, navigate, goBack, openCreatePlaylist }: ViewProps) {
  return (
    <div>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <button onClick={goBack} className="text-xs text-zinc-500 hover:text-zinc-300 mb-2 font-mono">← indietro</button>
          <h1 className="text-3xl font-serif font-light text-zinc-100">Le mie playlist</h1>
        </div>
        <button onClick={openCreatePlaylist} className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-2 rounded-full text-sm font-medium transition">
          <Plus size={14} /> Nuova
        </button>
      </header>
      <div className="space-y-1">
        {library.customPlaylists.length === 0 && (
          <p className="text-sm text-zinc-500 font-mono">nessuna playlist · creane una con il pulsante sopra</p>
        )}
        {library.customPlaylists.map(pl => (
          <button
            key={pl.id}
            onClick={() => navigate({ kind: 'list', title: pl.name, subtitle: `${pl.trackIds.length} tracce`, trackIds: pl.trackIds, seed: pl.id, kind2: 'playlist' })}
            className="w-full flex items-center gap-3 p-2 hover:bg-zinc-900/60 rounded-md transition text-left"
          >
            <Cover seed={pl.id} label={pl.name} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200 font-medium truncate">{pl.name}</p>
              <p className="text-xs text-zinc-500 truncate">Playlist · {pl.trackIds.length} tracce</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
