import { useState } from 'react';
import { X } from 'lucide-react';
import { slugify } from '../state/useCustomPlaylists';
import type { CreateResult } from '../state/useCustomPlaylists';

type Props = {
  onClose: () => void;
  onCreate: (name: string) => CreateResult;
};

export default function CreatePlaylistModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const slug = slugify(name);

  const submit = () => {
    if (!name.trim()) return;
    const res = onCreate(name);
    if (!res.ok) {
      setError(res.reason === 'duplicate' ? 'Esiste già una playlist con questo nome' : 'Nome non valido');
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-serif text-zinc-100">Nuova playlist</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
        </div>
        <input
          autoFocus
          value={name}
          onChange={e => { setName(e.target.value); setError(null); }}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="Nome playlist…"
          className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-md px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition"
        />
        <p className="text-xs text-zinc-500 mt-2 font-mono">→ {slug || '...'}.json</p>
        {error && <p className="text-xs text-rose-400 mt-2 font-mono">{error}</p>}
        <p className="text-xs text-zinc-600 mt-3">Salvata localmente come bozza. Esportala e committala in <code className="text-zinc-400">public/music/_playlists/</code> per renderla permanente.</p>
        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Annulla</button>
          <button onClick={submit} disabled={!name.trim()} className="px-4 py-2 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 rounded-md text-sm font-medium transition">Crea</button>
        </div>
      </div>
    </div>
  );
}
