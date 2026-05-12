import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFavorites } from './useFavorites';

describe('useFavorites', () => {
  it('parte vuoto se localStorage è vuoto', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites.size).toBe(0);
  });

  it('toggle aggiunge e rimuove un id', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggle('track-1'));
    expect(result.current.favorites.has('track-1')).toBe(true);
    act(() => result.current.toggle('track-1'));
    expect(result.current.favorites.has('track-1')).toBe(false);
  });

  it('persiste su localStorage', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.toggle('a');
      result.current.toggle('b');
    });
    const stored = JSON.parse(localStorage.getItem('own-music:favorites') || '[]');
    expect(stored.sort()).toEqual(['a', 'b']);
  });

  it('reidrata da localStorage al mount', () => {
    localStorage.setItem('own-music:favorites', JSON.stringify(['x', 'y']));
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites.has('x')).toBe(true);
    expect(result.current.favorites.has('y')).toBe(true);
  });
});
