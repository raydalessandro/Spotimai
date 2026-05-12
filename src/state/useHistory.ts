import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'own-music:history';
const SCHEMA_VERSION = 1;
const MAX_ENTRIES = 20;

type Stored = { schemaVersion: number; ids: string[] };

const readStored = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Stored;
    if (parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.ids)) return [];
    return parsed.ids.slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
};

const writeStored = (ids: string[]) => {
  try {
    const payload: Stored = { schemaVersion: SCHEMA_VERSION, ids };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
};

export function useHistory() {
  const [history, setHistory] = useState<string[]>(() => readStored());

  useEffect(() => {
    writeStored(history);
  }, [history]);

  const push = useCallback((trackId: string) => {
    setHistory(prev => {
      const without = prev.filter(id => id !== trackId);
      return [trackId, ...without].slice(0, MAX_ENTRIES);
    });
  }, []);

  return { history, push };
}
