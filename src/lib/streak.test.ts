import { describe, expect, it } from 'vitest';
import { nextTier, quoteFor, streakStats, tierFor, TIERS } from './streak';
import { emptyLog } from './logs';
import { addDays } from './date';
import type { LogDay } from './types';

const trained = (date: string): LogDay => ({ ...emptyLog(date), done: true });
const map = (logs: LogDay[]) => new Map(logs.map((l) => [l.date, l]));

describe('streakStats', () => {
  // 2026-11-09 is a Monday; Tuesday 10th is rest.
  it('counts workouts in a row and skips rest days', () => {
    const s = streakStats(map(['2026-11-09', '2026-11-11', '2026-11-12'].map(trained)), '2026-11-12');
    expect(s).toMatchObject({ current: 3, best: 3, total: 3, since: '2026-11-09', trainedToday: true });
  });
  it('today is pending until it ends', () => {
    const s = streakStats(map(['2026-11-09', '2026-11-11', '2026-11-12'].map(trained)), '2026-11-13');
    expect(s.current).toBe(3);
    expect(s.trainedToday).toBe(false);
  });
  it('a missed gym day resets current but keeps best', () => {
    const s = streakStats(map(['2026-11-09', '2026-11-11', '2026-11-13'].map(trained)), '2026-11-13');
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
    expect(s.total).toBe(3);
  });
  it('a planned rest swap does not break the streak', () => {
    const logs = [trained('2026-11-09'), { ...emptyLog('2026-11-11'), templateId: 'REST' as const }, trained('2026-11-12')];
    expect(streakStats(map(logs), '2026-11-12').current).toBe(2);
  });
  it('empty log is zero', () => {
    expect(streakStats(new Map(), '2026-11-13')).toMatchObject({ current: 0, best: 0, total: 0, since: null });
  });
  it('a long run of six-day weeks', () => {
    const logs: LogDay[] = [];
    for (let d = '2026-01-05'; d <= '2026-03-01'; d = addDays(d, 1)) if (new Date(`${d}T12:00`).getDay() !== 2) logs.push(trained(d));
    expect(streakStats(map(logs), '2026-03-01').current).toBe(logs.length);
  });
});

describe('tiers', () => {
  it('maps best streak to a tier', () => {
    expect(tierFor(0).id).toBe('bronze');
    expect(tierFor(5).id).toBe('bronze');
    expect(tierFor(6).id).toBe('silver');
    expect(tierFor(24).id).toBe('gold');
    expect(tierFor(155).id).toBe('diamond');
    expect(tierFor(156).id).toBe('apex');
    expect(tierFor(999).id).toBe('apex');
  });
  it('tiers ascend and apex is last', () => {
    expect(TIERS.map((t) => t.min)).toEqual([...TIERS.map((t) => t.min)].sort((a, b) => a - b));
    expect(nextTier(tierFor(200))).toBeNull();
    expect(nextTier(tierFor(0))?.id).toBe('silver');
  });
});

describe('quoteFor', () => {
  const list = ['a', 'b', 'c', 'd', 'e'];
  it('is stable within a day and changes the next day', () => {
    expect(quoteFor('2026-11-13', list)).toBe(quoteFor('2026-11-13', list));
    expect(quoteFor('2026-11-13', list)).not.toBe(quoteFor('2026-11-14', list));
  });
  it('visits every quote once per cycle', () => {
    const seen = new Set(Array.from({ length: 5 }, (_, i) => quoteFor(addDays('2026-11-13', i), list)));
    expect(seen.size).toBe(5);
  });
});
