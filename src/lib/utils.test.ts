import { describe, it, expect } from 'vitest';
import { fmtTime, gradientFor, initials } from './utils';

describe('fmtTime', () => {
  it('formatta secondi in m:ss con zero padding', () => {
    expect(fmtTime(0)).toBe('0:00');
    expect(fmtTime(5)).toBe('0:05');
    expect(fmtTime(60)).toBe('1:00');
    expect(fmtTime(125)).toBe('2:05');
    expect(fmtTime(3661)).toBe('61:01');
  });

  it('arrotonda i decimali verso il basso', () => {
    expect(fmtTime(59.9)).toBe('0:59');
    expect(fmtTime(0.4)).toBe('0:00');
  });

  it('gestisce input non validi', () => {
    expect(fmtTime(NaN)).toBe('0:00');
    expect(fmtTime(-10)).toBe('0:00');
    expect(fmtTime(Infinity)).toBe('0:00');
  });
});

describe('gradientFor', () => {
  it('è deterministico per stesso seed', () => {
    expect(gradientFor('demo')).toBe(gradientFor('demo'));
    expect(gradientFor('boom-bap')).toBe(gradientFor('boom-bap'));
  });

  it('produce gradienti diversi per seed diversi', () => {
    const a = gradientFor('alpha');
    const b = gradientFor('beta');
    expect(a).not.toBe(b);
  });

  it('è un linear-gradient con due hsl', () => {
    const g = gradientFor('test-album');
    expect(g).toMatch(/^linear-gradient\(135deg, hsl\(\d+, \d+%, \d+%\), hsl\(\d+, \d+%, \d+%\)\)$/);
  });
});

describe('initials', () => {
  it('prende le prime due iniziali in maiuscolo', () => {
    expect(initials('John Doe')).toBe('JD');
    expect(initials('Boom Bap')).toBe('BB');
  });
  it('si limita a una sola parola se presente', () => {
    expect(initials('Wu')).toBe('W');
  });
  it('tronca a due se ci sono più parole', () => {
    expect(initials('one two three four')).toBe('OT');
  });
});
