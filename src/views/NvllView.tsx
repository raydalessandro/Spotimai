import { useMemo, useState } from 'react';
import { Play, Star, MessageSquare, Download, RotateCcw } from 'lucide-react';
import Cover from '../components/Cover';
import { fmtTime } from '../lib/utils';
import type { NvllStatus, Track } from '../lib/types';
import type { ViewProps } from './_shared';
import type { useNvll } from '../state/useNvll';

export const NVLL_ARTIST = 'NVLL CLICK';

const STATUSES: NvllStatus[] = ['definitivo', 'provvisorio', 'scartato'];

const STATUS_STYLE: Record<NvllStatus, { on: string; off: string; dot: string; label: string }> = {
  definitivo:  { on: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40', off: 'text-zinc-600 hover:text-emerald-400/70', dot: 'bg-emerald-400', label: 'definitivo' },
  provvisorio: { on: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40',       off: 'text-zinc-600 hover:text-amber-400/70',  dot: 'bg-amber-400',  label: 'provvisorio' },
  scartato:    { on: 'bg-rose-500/10 text-rose-300/90 ring-1 ring-rose-500/30',       off: 'text-zinc-600 hover:text-rose-400/70',   dot: 'bg-rose-400',   label: 'scartato' },
};

/** "Ghost mode (Remix)" → "Remix"; senza parentesi finale è la versione base. */
export const versionLabel = (title: string): string => {
  const m = title.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : 'Originale';
};

type Piece = { name: string; versions: Track[] };

type Props = ViewProps & { nvll: ReturnType<typeof useNvll> };

export default function NvllView({ library, onPlay, currentTrackId, isPlaying, goBack, nvll }: Props) {
  const [filter, setFilter] = useState<NvllStatus | 'tutti'>('tutti');
  const [openNote, setOpenNote] = useState<string | null>(null);

  const pieces = useMemo<Piece[]>(() => {
    const byPiece = new Map<string, Track[]>();
    for (const t of library.tracks) {
      if (t.artist !== NVLL_ARTIST) continue;
      const list = byPiece.get(t.album) ?? [];
      list.push(t);
      byPiece.set(t.album, list);
    }
    return [...byPiece.entries()]
      .map(([name, versions]) => ({ name, versions: [...versions].sort((a, b) => a.path.localeCompare(b.path)) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }, [library]);

  const totals = useMemo(() => {
    const counts: Record<NvllStatus, number> = { definitivo: 0, provvisorio: 0, scartato: 0 };
    let versions = 0;
    for (const p of pieces) for (const v of p.versions) { counts[nvll.statusOf(v.id)]++; versions++; }
    return { counts, versions };
  }, [pieces, nvll]);

  const visible = useMemo(() => {
    if (filter === 'tutti') return pieces;
    return pieces
      .map(p => ({ ...p, versions: p.versions.filter(v => nvll.statusOf(v.id) === filter) }))
      .filter(p => p.versions.length > 0);
  }, [pieces, filter, nvll]);

  if (pieces.length === 0) {
    return (
      <div>
        <button onClick={goBack} className="text-xs text-zinc-500 hover:text-zinc-300 mb-2 font-mono">← indietro</button>
        <h1 className="text-3xl font-serif font-light text-zinc-100 mb-3">NVLL CLICK</h1>
        <p className="text-sm text-zinc-500 font-mono">nessun pezzo · carica i file sotto boom-bap/nvll-click/ e lancia pnpm ingest</p>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-5">
        <button onClick={goBack} className="text-xs text-zinc-500 hover:text-zinc-300 mb-2 font-mono">← indietro</button>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-serif font-light text-zinc-100 tracking-wide">NVLL CLICK</h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              selezione · {pieces.length} pezzi · {totals.versions} versioni
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={nvll.exportJSON}
              title="Scarica lo stato come JSON (copia di sicurezza)"
              className="flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-emerald-400 transition px-3 py-2"
            >
              <Download size={14} strokeWidth={1.5} /> esporta
            </button>
            <button
              type="button"
              onClick={() => { if (confirm('Azzerare flag, voti e commenti di questa selezione?')) nvll.reset(); }}
              title="Azzera flag, voti e commenti"
              className="p-2 text-zinc-600 hover:text-rose-400 transition"
              aria-label="Azzera selezione"
            >
              <RotateCcw size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto -mx-1 px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip active={filter === 'tutti'} onClick={() => setFilter('tutti')} label="tutti" count={totals.versions} />
        {STATUSES.map(s => (
          <FilterChip
            key={s}
            active={filter === s}
            onClick={() => setFilter(s)}
            label={STATUS_STYLE[s].label}
            count={totals.counts[s]}
            dot={STATUS_STYLE[s].dot}
          />
        ))}
      </div>

      <div className="space-y-2">
        {visible.map(piece => {
          const pick = nvll.pickOf(piece.name);
          return (
            <section key={piece.name} className="rounded-lg border border-zinc-900 bg-zinc-950/40 overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2.5 border-b border-zinc-900/70">
                <Cover seed={piece.name} label={piece.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm text-zinc-100 truncate">{piece.name}</h2>
                  <p className="text-[11px] text-zinc-600 font-mono">
                    {piece.versions.length === 1 ? '1 versione' : `${piece.versions.length} versioni`}
                    {pick && ' · votata'}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-zinc-900/50">
                {piece.versions.map(v => {
                  const st = nvll.statusOf(v.id);
                  const nowPlaying = currentTrackId === v.id;
                  const note = nvll.noteOf(v.id);
                  const noteOpen = openNote === v.id;
                  return (
                    <div key={v.id} className={`px-3 py-2.5 ${st === 'scartato' ? 'opacity-55' : ''}`}>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onPlay(v.id, piece.versions.map(x => x.id))}
                          aria-label={`Riproduci ${v.title}`}
                          className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/70 transition"
                        >
                          {nowPlaying && isPlaying ? (
                            <div className="flex gap-0.5 items-end h-3">
                              <span className="w-0.5 bg-emerald-400 animate-pulse-bar" style={{ height: '60%', animationDelay: '0ms' }} />
                              <span className="w-0.5 bg-emerald-400 animate-pulse-bar" style={{ height: '100%', animationDelay: '150ms' }} />
                              <span className="w-0.5 bg-emerald-400 animate-pulse-bar" style={{ height: '40%', animationDelay: '300ms' }} />
                            </div>
                          ) : (
                            <Play size={12} fill="currentColor" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className={`text-sm truncate ${nowPlaying ? 'text-emerald-400' : 'text-zinc-200'}`}>
                            {versionLabel(v.title)}
                          </p>
                          <p className="text-[11px] text-zinc-600 font-mono truncate">
                            {fmtTime(v.duration)}{v.year ? ` · ${v.year}` : ''}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => nvll.togglePick(piece.name, v.id)}
                          aria-label={pick === v.id ? 'Togli il voto' : 'Vota come versione migliore'}
                          title={pick === v.id ? 'Togli il voto' : 'Vota come versione migliore'}
                          className={`p-1.5 shrink-0 transition ${pick === v.id ? 'text-amber-300' : 'text-zinc-700 hover:text-amber-300/70'}`}
                        >
                          <Star size={15} fill={pick === v.id ? 'currentColor' : 'none'} strokeWidth={1.5} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setOpenNote(noteOpen ? null : v.id)}
                          aria-label="Commento"
                          title="Commento"
                          className={`p-1.5 shrink-0 transition ${note ? 'text-emerald-400' : 'text-zinc-700 hover:text-zinc-400'}`}
                        >
                          <MessageSquare size={15} strokeWidth={1.5} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1 mt-2 pl-11 flex-wrap">
                        {STATUSES.map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => nvll.setStatus(v.id, s)}
                            aria-pressed={st === s}
                            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded transition ${st === s ? STATUS_STYLE[s].on : STATUS_STYLE[s].off}`}
                          >
                            {STATUS_STYLE[s].label}
                          </button>
                        ))}
                      </div>

                      {(noteOpen || note) && (
                        <div className="pl-11 mt-2">
                          {noteOpen ? (
                            <textarea
                              autoFocus
                              value={note}
                              onChange={e => nvll.setNote(v.id, e.target.value)}
                              onBlur={() => setOpenNote(null)}
                              placeholder="cosa non va, cosa tenere…"
                              rows={2}
                              className="w-full bg-zinc-900/70 border border-zinc-800 rounded-md px-2.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-y"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setOpenNote(v.id)}
                              className="text-left text-[11px] text-zinc-500 hover:text-zinc-300 font-mono leading-relaxed transition"
                            >
                              {note}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-[11px] text-zinc-600 font-mono mt-6 px-1 leading-relaxed">
        Flag, voti e commenti vivono solo su questo dispositivo, come le bozze playlist. L'export è una
        copia di sicurezza da tenere da parte: <code className="text-zinc-500">pnpm ingest</code> non la rilegge.
      </p>
    </div>
  );
}

function FilterChip({ active, onClick, label, count, dot }: { active: boolean; onClick: () => void; label: string; count: number; dot?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-full transition ${
        active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60'
      }`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {label}
      <span className="text-zinc-600">{count}</span>
    </button>
  );
}
