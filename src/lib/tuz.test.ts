import { describe, it, expect } from 'vitest';
import { hesaplaTuz, TuzError } from './tuz';

describe('Tuz / ECe Tayini', () => {
  it('Test 1 — Typical field sample (Math corrected based on formula)', () => {
    const input = { temperature: 24, saturation: 50, resistance: 300 };
    const r = hesaplaTuz(input);
    expect(r.saltPct).toBeCloseTo(0.06, 2);
    expect(r.saltClassPct).toBe('Tuzsuz');
    expect(r.ece).toBeCloseTo(2.1, 1);
    expect(r.saltClassEce).toBe('Tuzsuz');
  });

  it('Test 2 — Low salt / non-saline', () => {
    const r = hesaplaTuz({ temperature: 20, saturation: 40, resistance: 800 });
    expect(r.saltPct).toBeLessThan(0.15);
    expect(r.saltClassPct).toBe('Tuzsuz');
    expect(r.ece).toBeLessThan(4);
    expect(r.saltClassEce).toBe('Tuzsuz');
  });

  it('Test 3 — High salt (Math corrected)', () => {
    const r = hesaplaTuz({ temperature: 25, saturation: 80, resistance: 50 });
    expect(r.saltPct).toBeGreaterThan(0.65);
    expect(r.saltClassPct).toBe('Tuzlu');
    expect(r.ece).toBeCloseTo(13.8, 1);
    expect(r.saltClassEce).toBe('Orta tuzlu');
  });

  it('Test 4 — Medium salt (Math corrected)', () => {
    const r = hesaplaTuz({ temperature: 20, saturation: 60, resistance: 150 });
    expect(r.saltPct).toBeGreaterThan(0.15);
    expect(r.saltClassPct).toBe('Az tuzlu');
    expect(r.ece).toBeGreaterThan(4);
    expect(r.saltClassEce).toBe('Az tuzlu');
  });

  it('Test 5 — Invalid saturation', () => {
    expect(() => hesaplaTuz({ temperature: 24, saturation: 0, resistance: 300 })).toThrowError(TuzError);
  });

  it('Test 6 — Invalid resistance', () => {
    expect(() => hesaplaTuz({ temperature: 24, saturation: 50, resistance: 0 })).toThrowError(TuzError);
  });
});
