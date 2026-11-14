import { describe, expect, it } from 'vitest';
import { bestE1RM, epley1RM, isPR, movingAverage, paceOf, topSet, volume, weeklyRate, type WeightPoint } from './calc';
import { addDays } from './date';

describe('epley1RM', () => {
  it('applies Epley: w × (1 + r/30)', () => {
    expect(epley1RM(20, 10)).toBeCloseTo(26.667, 3);
    expect(epley1RM(100, 5)).toBeCloseTo(116.667, 3);
  });
  it('returns the weight for a single', () => {
    expect(epley1RM(140, 1)).toBe(140);
  });
  it('returns 0 for missing load or reps', () => {
    expect(epley1RM(0, 10)).toBe(0);
    expect(epley1RM(20, 0)).toBe(0);
  });
  it('bestE1RM ignores unlogged and bodyweight sets', () => {
    expect(bestE1RM([{ w: 20, r: 10 }, { w: 22.5, r: null }, { w: null, r: 15 }, { w: 20, r: 8 }])).toBeCloseTo(26.667, 3);
  });
});

describe('volume', () => {
  it('sums kg × reps over logged sets', () => {
    expect(volume([{ w: 20, r: 10 }, { w: 20, r: 9 }, { w: 20, r: 8 }])).toBe(540);
  });
  it('skips sets without reps or load', () => {
    expect(volume([{ w: 20, r: null }, { w: null, r: 12 }, { w: 10, r: 0 }])).toBe(0);
  });
  it('topSet picks the heaviest logged set, ties by reps', () => {
    expect(topSet([{ w: 20, r: 10 }, { w: 22.5, r: 6 }, { w: 22.5, r: 7 }, { w: 30, r: null }])).toEqual({ w: 22.5, r: 7 });
    expect(topSet([])).toBeNull();
  });
});

describe('isPR', () => {
  const prior = [[{ w: 20, r: 10 }], [{ w: 20, r: 9 }, { w: 20, r: 8 }]];
  it('is true when e1RM beats every earlier session', () => {
    expect(isPR([{ w: 20, r: 11 }], prior)).toBe(true);
    expect(isPR([{ w: 22.5, r: 8 }], prior)).toBe(true);
  });
  it('is false when it only ties or falls short', () => {
    expect(isPR([{ w: 20, r: 10 }], prior)).toBe(false);
    expect(isPR([{ w: 20, r: 8 }], prior)).toBe(false);
  });
  it('is false for a first-ever session or nothing logged', () => {
    expect(isPR([{ w: 20, r: 10 }], [])).toBe(false);
    expect(isPR([{ w: 20, r: null }], prior)).toBe(false);
  });
});

describe('movingAverage', () => {
  it('averages weigh-ins in the trailing 7 calendar days', () => {
    const pts: WeightPoint[] = [
      { date: '2026-11-01', weight: 100 },
      { date: '2026-11-03', weight: 99 },
      { date: '2026-11-07', weight: 98 },
      { date: '2026-11-08', weight: 97 },
    ];
    const ma = movingAverage(pts);
    expect(ma.map((p) => p.avg)).toEqual([100, 99.5, 99, 98]);
  });
  it('sorts input and handles empty', () => {
    expect(movingAverage([])).toEqual([]);
    const ma = movingAverage([{ date: '2026-11-02', weight: 98 }, { date: '2026-11-01', weight: 100 }]);
    expect(ma[0]?.date).toBe('2026-11-01');
    expect(ma[1]?.avg).toBe(99);
  });
});

describe('weeklyRate', () => {
  const series = (days: number, perDay: number, start = 100): WeightPoint[] =>
    Array.from({ length: days }, (_, i) => ({ date: addDays('2026-10-01', i), weight: start + perDay * i }));

  it('returns kg/week from a linear fit', () => {
    expect(weeklyRate(series(14, -0.1))).toBeCloseTo(-0.7, 6);
  });
  it('only looks at the lookback window', () => {
    const pts = [...series(30, 0, 105), ...series(14, -0.05).map((p) => ({ ...p, date: addDays(p.date, 40) }))];
    expect(weeklyRate(pts, 13)).toBeCloseTo(-0.35, 6);
  });
  it('needs 3+ points spanning 5+ days', () => {
    expect(weeklyRate(series(2, -0.1))).toBeNull();
    expect(weeklyRate(series(4, -0.1))).toBeNull();
    expect(weeklyRate(series(6, -0.1))).not.toBeNull();
  });
  it('classifies pace', () => {
    expect(paceOf(0.2)).toBe('gaining');
    expect(paceOf(-0.2)).toBe('slow');
    expect(paceOf(-0.3)).toBe('on-pace');
    expect(paceOf(-1)).toBe('on-pace');
    expect(paceOf(-1.2)).toBe('fast');
  });
});
