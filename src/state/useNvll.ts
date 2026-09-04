import { useCallback, useEffect, useState } from 'react';
import type { NvllStatus } from '../lib/types';

const STORAGE_KEY = 'own-music:nvll';
const SCHEMA_VERSION = 1;

export const DEFAULT_STATUS: NvllStatus = 'provvisorio';

/**
 * Stato della selezione NVLL CLICK. Vive solo su questo dispositivo, come le
 * bozze playlist: il voto è personale, non c'è backend e non si sincronizza.
 *  - status: per versione (trackId) → definitivo | provvisorio | scartato
 *  - picks:  per pezzo (album) → trackId della versione votata come migliore
 *  - notes:  per versione (trackId) → commento libero
 */
export type NvllState = {
  schemaVersion: number;
  status: Record<string, NvllStatus>;
  picks: Record<string, string>;
  notes: Record<string, string>;
};

const EMPTY: NvllState = { schemaVersion: SCHEMA_VERSION, status: {}, picks: {}, notes: {} };

const isStatus = (v: unknown): v is NvllStatus =>
  v === 'definitivo' || v === 'provvisorio' || v === 'scartato';

const isRecordOfStrings = (v: unknown): v is Record<string, string> =>
  !!v && typeof v === 'object' && !Array.isArray(v) &&
  Object.values(v as Record<string, unknown>).every(x => typeof x === 'string');

export const readStored = (): NvllState => {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<NvllState>;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return EMPTY;
    const status: Record<string, NvllStatus> = {};
    for (const [k, v] of Object.entries(parsed.status ?? {})) {
      if (isStatus(v)) status[k] = v;
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      status,
      picks: isRecordOfStrings(parsed.picks) ? parsed.picks : {},
      notes: isRecordOfStrings(parsed.notes) ? parsed.notes : {},
    };
  } catch {
    return EMPTY;
  }
};

const writeStored = (state: NvllState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
};

export function useNvll() {
  const [state, setState] = useState<NvllState>(() => readStored());

  useEffect(() => {
    writeStored(state);
  }, [state]);

  const statusOf = useCallback(
    (trackId: string): NvllStatus => state.status[trackId] ?? DEFAULT_STATUS,
    [state.status],
  );

  const setStatus = useCallback((trackId: string, next: NvllStatus) => {
    setState(prev => ({ ...prev, status: { ...prev.status, [trackId]: next } }));
  }, []);

  const pickOf = useCallback(
    (piece: string): string | null => state.picks[piece] ?? null,
    [state.picks],
  );

  /** Vota una versione come migliore del pezzo. Rivotare la stessa annulla il voto. */
  const togglePick = useCallback((piece: string, trackId: string) => {
    setState(prev => {
      const picks = { ...prev.picks };
      if (picks[piece] === trackId) delete picks[piece];
      else picks[piece] = trackId;
      return { ...prev, picks };
    });
  }, []);

  const noteOf = useCallback(
    (trackId: string): string => state.notes[trackId] ?? '',
    [state.notes],
  );

  const setNote = useCallback((trackId: string, text: string) => {
    setState(prev => {
      const notes = { ...prev.notes };
      if (text.trim()) notes[trackId] = text;
      else delete notes[trackId];
      return { ...prev, notes };
    });
  }, []);

  const reset = useCallback(() => setState(EMPTY), []);

  /**
   * Scarica lo stato come JSON. È una copia di sicurezza da committare a mano:
   * l'ingest non la rilegge, quindi non torna indietro da sola.
   */
  const exportJSON = useCallback(() => {
    if (typeof document === 'undefined') return;
    const payload = { ...state, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nvll-selezione.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [state]);

  return { state, statusOf, setStatus, pickOf, togglePick, noteOf, setNote, reset, exportJSON };
}
