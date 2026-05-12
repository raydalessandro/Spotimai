import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from './useHistory';

describe('useHistory', () => {
  it('parte vuoto se localStorage è vuoto', () => {
    const { result } = renderHook(() => useHistory());
    expect(result.current.history).toEqual([]);
  });

  it('push aggiunge in testa', () => {
    const { result } = renderHook(() => useHistory());
    act(() => result.current.push('a'));
    act(() => result.current.push('b'));
    expect(result.current.history).toEqual(['b', 'a']);
  });

  it('push dello stesso id lo sposta in testa senza duplicare', () => {
    const { result } = renderHook(() => useHistory());
    act(() => {
      result.current.push('a');
      result.current.push('b');
      result.current.push('a');
    });
    expect(result.current.history).toEqual(['a', 'b']);
  });

  it('cappa a 20 entries', () => {
    const { result } = renderHook(() => useHistory());
    act(() => {
      for (let i = 0; i < 25; i++) result.current.push(`t${i}`);
    });
    expect(result.current.history).toHaveLength(20);
    expect(result.current.history[0]).toBe('t24');
    expect(result.current.history[19]).toBe('t5');
  });

  it('persiste su localStorage con schemaVersion', () => {
    const { result } = renderHook(() => useHistory());
    act(() => result.current.push('t1'));
    const raw = localStorage.getItem('own-music:history');
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw!);
    expect(stored.schemaVersion).toBe(1);
    expect(stored.ids).toEqual(['t1']);
  });

  it('reidrata da localStorage al mount', () => {
    localStorage.setItem('own-music:history', JSON.stringify({
      schemaVersion: 1,
      ids: ['x', 'y'],
    }));
    const { result } = renderHook(() => useHistory());
    expect(result.current.history).toEqual(['x', 'y']);
  });

  it('ignora payload con schemaVersion sbagliata', () => {
    localStorage.setItem('own-music:history', JSON.stringify({
      schemaVersion: 99,
      ids: ['x'],
    }));
    const { result } = renderHook(() => useHistory());
    expect(result.current.history).toEqual([]);
  });
});
