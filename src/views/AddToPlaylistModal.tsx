import { useMemo, useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import Cover from '../components/Cover';
import type { Library, Playlist, Track } from '../lib/types';
import type { CreateResult } from '../state/useCustomPlaylists';

type Props = {
  trackId: string;
  library: Library;
  drafts: Playlist[];
  onClose: () => void;
  onCreate: (name: string) => CreateResult;
  onAddTrack: (draftId: string, trackId: string) => void;
};

export default function AddToPlaylistModal({ trackId, library, drafts, onClose, onCreate, onAddTrack }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const track: Track | undefined = useMemo(
    () => library.tracks.find(t => t.id === trackId),
    [library, trackId]
  );

  const addToDraft = (draftId: string) => {
    onAddTrack(draftId, trackId);
    setJustAdded(draftId);
    setTimeout(onClose, 350);
  };

  const submitCreate = () => {
    if (!newName.trim()) return;
    const res = onCreate(newName);
    if (!res.ok) {
      setError(res.reason === 'duplicate' ? 'Esiste già una playlist con questo nome' : 'Nome non valido');
      return;
    }
    addToDraft(res.playlist.id);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-sm max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-serif text-zinc-100">Aggiungi a playlist</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
        </div>
        {track && (
          <p className="text-xs text-zinc-500 mb-4 truncate font-mono">
            {track.title} · {track.artist}
          </p>
        )}

        <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
          <button
            type="button"
            onClick={() => { setCreating(true); setError(null); }}
            className="w-full flex items-center gap-3 p-2 hover:bg-zinc-800/60 rounded-md transition text-left"
          >
            <div className="w-10 h-10 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-400">
              <Plus size={18} strokeWidth={1.5} />
            </div>
            <span className="text-sm text-zinc-200">Nuova playlist</span>
          </button>

          {creating && (
            <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-md">
              <input
                autoFocus
                value={newName}
                onChange={e => { setNewName(e.target.value); setError(null); }}
                onKeyDown={e => { if (e.key === 'Enter') submitCreate(); if (e.key === 'Escape') setCreating(false); }}
                placeholder="Nome playlist…"
                className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none px-1 py-1"
              />
              {error && <p className="text-xs text-rose-400 mt-1 font-mono px-1">{error}</p>}
              <div className="flex gap-1 justify-end mt-2">
                <button
                  onClick={() => { setCreating(false); setNewName(''); setError(null); }}
                  className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                >Annulla</button>
                <button
                  onClick={submitCreate}
                  disabled={!newName.trim()}
                  className="px-3 py-1 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 rounded text-xs font-medium"
                >Crea e aggiungi</button>
              </div>
            </div>
          )}

          {drafts.length === 0 && library.customPlaylists.length === 0 && !creating && (
            <p className="text-xs text-zinc-500 font-mono py-3 px-2">nessuna playlist · creane una</p>
          )}

          {drafts.map(pl => {
            const already = pl.trackIds.includes(trackId);
            const added = justAdded === pl.id;
            return (
              <button
                key={pl.id}
                type="button"
                disabled={already}
                onClick={() => addToDraft(pl.id)}
                className="w-full flex items-center gap-3 p-2 hover:bg-zinc-800/60 disabled:hover:bg-transparent rounded-md transition text-left disabled:cursor-default"
              >
                <Cover seed={pl.id} label={pl.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{pl.name}</p>
                  <p className="text-xs text-zinc-500 truncate font-mono">bozza · {pl.trackIds.length} tracce</p>
                </div>
                {(already || added) && <Check size={16} className="text-emerald-400 shrink-0" />}
              </button>
            );
          })}

          {library.customPlaylists.length > 0 && (
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-700 font-mono pt-3 pb-1 px-2">Sincronizzate (read-only)</p>
          )}
          {library.customPlaylists.map(pl => (
            <div
              key={pl.id}
              className="w-full flex items-center gap-3 p-2 rounded-md opacity-60"
              title="Playlist sincronizzata — modificala in public/music/_playlists/ e rilancia ingest"
            >
              <Cover seed={pl.id} label={pl.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 truncate">{pl.name}</p>
                <p className="text-xs text-zinc-500 truncate font-mono">sincronizzata · {pl.trackIds.length} tracce</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
