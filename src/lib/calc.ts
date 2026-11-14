/** Pure training and body-weight math. No I/O, fully unit-tested. */
import type { LogDay, SetEntry } from './types';
import { addDays, diffDays } from './date';

/** A set is logged once reps (or seconds) are entered. */
export const isLogged = (s: SetEntry): boolean => s.r !== null && s.r > 0;

/** Epley estimated 1RM. A single rep returns the weight itself. */
export function epley1RM(w: number, r: number): number {
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

/** Best estimated 1RM across a session's sets (0 if none weighted). */
export function bestE1RM(sets: SetEntry[]): number {
  let best = 0;
  for (const s of sets) {
    if (!isLogged(s) || s.w === null) continue;
    best = Math.max(best, epley1RM(s.w, s.r ?? 0));
  }
  return best;
}

/** Volume load: sum of kg × reps over logged weighted sets. */
export function volume(sets: SetEntry[]): number {
  let v = 0;
  for (const s of sets) if (isLogged(s) && s.w !== null && s.w > 0) v += s.w * (s.r ?? 0);
  return v;
}

/** The heaviest logged set (ties broken by more reps). */
export function topSet(sets: SetEntry[]): SetEntry | null {
  let best: SetEntry | null = null;
  for (const s of sets) {
    if (!isLogged(s) || s.w === null || s.w <= 0) continue;
    if (best === null || s.w > (best.w ?? 0) || (s.w === best.w && (s.r ?? 0) > (best.r ?? 0))) best = s;
  }
  return best;
}

export function dayVolume(log: LogDay): number {
  let v = 0;
  for (const sets of Object.values(log.ex)) v += volume(sets);
  return v;
}

export function loggedSetCount(log: LogDay | undefined): number {
  if (!log) return 0;
  let n = 0;
  for (const sets of Object.values(log.ex)) for (const s of sets) if (isLogged(s)) n++;
  return n;
}

/**
 * PR detection: true when this session's best e1RM strictly beats every
 * earlier session for that exercise. A first-ever session is not a PR,
 * because there is nothing to beat yet.
 */
export function isPR(current: SetEntry[], earlierSessions: SetEntry[][]): boolean {
  const cur = bestE1RM(current);
  if (cur <= 0) return false;
  const prior = earlierSessions.map(bestE1RM).filter((x) => x > 0);
  if (prior.length === 0) return false;
  return cur > Math.max(...prior) + 1e-9;
}

export interface WeightPoint {
  date: string;
  weight: number;
}

export interface AvgPoint {
  date: string;
  avg: number;
}

/**
 * Trailing moving average: for every weigh-in date, the mean of all
 * weigh-ins in the `window` calendar days ending on that date (inclusive).
 */
export function movingAverage(points: WeightPoint[], window = 7): AvgPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((pt) => {
    const from = addDays(pt.date, -(window - 1));
    const inWin = sorted.filter((q) => q.date >= from && q.date <= pt.date);
    const avg = inWin.reduce((s, q) => s + q.weight, 0) / inWin.length;
    return { date: pt.date, avg };
  });
}

/**
 * Weekly rate of change in kg/week (negative = losing), from a least-squares
 * fit over weigh-ins in the last `lookbackDays` up to the latest weigh-in.
 * Needs at least 3 weigh-ins spanning 5+ days, otherwise null.
 */
export function weeklyRate(points: WeightPoint[], lookbackDays = 21): number | null {
  if (points.length < 3) return null;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  if (!last) return null;
  const from = addDays(last.date, -lookbackDays);
  const win = sorted.filter((q) => q.date >= from);
  const first = win[0];
  if (!first || win.length < 3 || diffDays(first.date, last.date) < 5) return null;
  const xs = win.map((q) => diffDays(first.date, q.date));
  const ys = win.map((q) => q.weight);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - mx;
    num += dx * ((ys[i] ?? 0) - my);
    den += dx * dx;
  }
  if (den === 0) return null;
  return (num / den) * 7;
}

export type Pace = 'gaining' | 'slow' | 'on-pace' | 'fast';

/** Classify a weekly rate (kg/week, negative = losing). */
export function paceOf(rate: number): Pace {
  const loss = -rate;
  if (loss < 0) return 'gaining';
  if (loss < 0.3) return 'slow';
  if (loss <= 1) return 'on-pace';
  return 'fast';
}

/** Format kg: drop trailing zeros, max 2 decimals. */
export function fmtKg(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export function fmtSet(s: SetEntry, timed: boolean): string {
  const r = s.r ?? 0;
  if (timed) return s.w !== null && s.w > 0 ? `${fmtKg(s.w)}×${r}s` : `${r}s`;
  return s.w !== null && s.w > 0 ? `${fmtKg(s.w)}×${r}` : `BW×${r}`;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}
