import { Plus, Download, Trash2 } from 'lucide-react';
import Cover from '../components/Cover';
import type { ViewProps } from './_shared';
import type { Playlist } from '../lib/types';

type Props = ViewProps & {
  drafts: Playlist[];
  exportJSON: (id: string) => void;
  removeDraft: (id: string) => void;
};

export default function PlaylistsView({ library, navigate, goBack, openCreatePlaylist, drafts, exportJSON, removeDraft }: Props) {
  const allEmpty = drafts.length === 0 && library.customPlaylists.length === 0;
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

      {allEmpty && (
        <p className="text-sm text-zinc-500 font-mono">nessuna playlist · creane una con il pulsante sopra</p>
      )}

      {drafts.length > 0 && (
        <section className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-mono mb-2 px-2">Bozze locali</p>
          <div className="space-y-1">
            {drafts.map(pl => (
              <div key={pl.id} className="group flex items-center gap-3 p-2 hover:bg-zinc-900/60 rounded-md transition">
                <button
                  onClick={() => navigate({ kind: 'list', title: pl.name, subtitle: `bozza · ${pl.trackIds.length} tracce`, trackIds: pl.trackIds, seed: pl.id, kind2: 'playlist' })}
                  className="flex-1 flex items-center gap-3 min-w-0 text-left"
                >
                  <Cover seed={pl.id} label={pl.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 font-medium truncate">{pl.name}</p>
                    <p className="text-xs text-amber-500/80 truncate font-mono">bozza · {pl.trackIds.length} tracce · esporta per sincronizzare</p>
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label="Esporta JSON"
                    onClick={() => exportJSON(pl.id)}
                    className="p-2 text-zinc-500 hover:text-emerald-400 transition"
                    title="Scarica JSON · committalo in public/music/_playlists/"
                  >
                    <Download size={16} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    aria-label="Elimina bozza"
                    onClick={() => {
                      if (confirm(`Eliminare la bozza "${pl.name}"?`)) removeDraft(pl.id);
                    }}
                    className="p-2 text-zinc-500 hover:text-rose-400 transition"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-zinc-600 font-mono mt-3 px-2 leading-relaxed">
            Le bozze vivono solo su questo dispositivo. Esporta il JSON e committalo in <code className="text-zinc-400">public/music/_playlists/</code>, poi <code className="text-zinc-400">pnpm ingest</code>: la bozza sparirà da qui e diventerà sincronizzata.
          </p>
        </section>
      )}

      {library.customPlaylists.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-mono mb-2 px-2">Sincronizzate</p>
          <div className="space-y-1">
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
        </section>
      )}
    </div>
  );
}
