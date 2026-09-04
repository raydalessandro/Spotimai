import { describe, it, expect } from 'vitest';
import { versionLabel } from './NvllView';

describe('versionLabel', () => {
  it('estrae la parentesi finale come nome della versione', () => {
    expect(versionLabel('Ghost mode (Remix)')).toBe('Remix');
    expect(versionLabel('Moviola (Remastered)')).toBe('Remastered');
    expect(versionLabel('Box (Long trial)')).toBe('Long trial');
  });

  it('senza parentesi la versione e loriginale', () => {
    expect(versionLabel('Terra')).toBe('Originale');
    expect(versionLabel('Blu')).toBe('Originale');
  });

  it('guarda solo la parentesi in fondo, non quelle in mezzo', () => {
    expect(versionLabel('Pezzo (feat. X) (Remix)')).toBe('Remix');
    expect(versionLabel('Pezzo (feat. X) dal vivo')).toBe('Originale');
  });
});
