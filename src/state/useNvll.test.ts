import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNvll, DEFAULT_STATUS } from './useNvll';

const KEY = 'own-music:nvll';

describe('useNvll', () => {
  beforeEach(() => localStorage.clear());

  it('parte con tutto provvisorio', () => {
    const { result } = renderHook(() => useNvll());
    expect(result.current.statusOf('abc')).toBe(DEFAULT_STATUS);
    expect(result.current.pickOf('Blu')).toBeNull();
    expect(result.current.noteOf('abc')).toBe('');
  });

  it('salva e rilegge lo stato da localStorage', () => {
    const first = renderHook(() => useNvll());
    act(() => {
      first.result.current.setStatus('abc', 'definitivo');
      first.result.current.togglePick('Blu', 'abc');
      first.result.current.setNote('abc', 'tenere questa');
    });
    const second = renderHook(() => useNvll());
    expect(second.result.current.statusOf('abc')).toBe('definitivo');
    expect(second.result.current.pickOf('Blu')).toBe('abc');
    expect(second.result.current.noteOf('abc')).toBe('tenere questa');
  });

  it('rivotare la stessa versione annulla il voto', () => {
    const { result } = renderHook(() => useNvll());
    act(() => result.current.togglePick('Blu', 'v1'));
    expect(result.current.pickOf('Blu')).toBe('v1');
    act(() => result.current.togglePick('Blu', 'v1'));
    expect(result.current.pickOf('Blu')).toBeNull();
  });

  it('un solo voto per pezzo: votare unaltra versione sposta il voto', () => {
    const { result } = renderHook(() => useNvll());
    act(() => result.current.togglePick('Blu', 'v1'));
    act(() => result.current.togglePick('Blu', 'v2'));
    expect(result.current.pickOf('Blu')).toBe('v2');
  });

  it('i voti di pezzi diversi sono indipendenti', () => {
    const { result } = renderHook(() => useNvll());
    act(() => {
      result.current.togglePick('Blu', 'v1');
      result.current.togglePick('Terra', 't1');
    });
    expect(result.current.pickOf('Blu')).toBe('v1');
    expect(result.current.pickOf('Terra')).toBe('t1');
  });

  it('un commento vuoto viene rimosso invece di restare a stringa vuota', () => {
    const { result } = renderHook(() => useNvll());
    act(() => result.current.setNote('abc', 'bozza'));
    act(() => result.current.setNote('abc', '   '));
    expect(result.current.noteOf('abc')).toBe('');
    expect(JSON.parse(localStorage.getItem(KEY)!).notes).toEqual({});
  });

  it('ignora uno stato salvato con schemaVersion diverso', () => {
    localStorage.setItem(KEY, JSON.stringify({ schemaVersion: 99, status: { abc: 'definitivo' }, picks: {}, notes: {} }));
    const { result } = renderHook(() => useNvll());
    expect(result.current.statusOf('abc')).toBe(DEFAULT_STATUS);
  });

  it('scarta valori di stato non validi senza buttare il resto', () => {
    localStorage.setItem(KEY, JSON.stringify({
      schemaVersion: 1,
      status: { buono: 'definitivo', rotto: 'inventato' },
      picks: { Blu: 'v1' },
      notes: {},
    }));
    const { result } = renderHook(() => useNvll());
    expect(result.current.statusOf('buono')).toBe('definitivo');
    expect(result.current.statusOf('rotto')).toBe(DEFAULT_STATUS);
    expect(result.current.pickOf('Blu')).toBe('v1');
  });

  it('sopravvive a localStorage illeggibile', () => {
    localStorage.setItem(KEY, 'non-e-json{');
    const { result } = renderHook(() => useNvll());
    expect(result.current.statusOf('abc')).toBe(DEFAULT_STATUS);
  });

  it('reset azzera tutto', () => {
    const { result } = renderHook(() => useNvll());
    act(() => {
      result.current.setStatus('abc', 'scartato');
      result.current.togglePick('Blu', 'abc');
      result.current.setNote('abc', 'nota');
    });
    act(() => result.current.reset());
    expect(result.current.statusOf('abc')).toBe(DEFAULT_STATUS);
    expect(result.current.pickOf('Blu')).toBeNull();
    expect(result.current.noteOf('abc')).toBe('');
  });
});
