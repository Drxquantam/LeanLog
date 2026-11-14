/** Gym streak, card tiers and quote of the day. Pure functions, unit-tested. */
import type { LogDay } from './types';
import { addDays, diffDays } from './date';
import { isWorkoutDay } from './logs';
import { scheduledTemplate } from './program';
import { QUOTES } from './quotes';

export interface StreakStats {
  /** Workouts in a row, counting back from today. Rest days never break it; today is pending until it ends. */
  current: number;
  /** Longest run of workouts in a row ever. */
  best: number;
  /** All workouts ever logged. */
  total: number;
  /** First day anything was logged, or null. */
  since: string | null;
  /** True when today is a gym day that already has a workout. */
  trainedToday: boolean;
}

export function streakStats(byDate: Map<string, LogDay>, today: string): StreakStats {
  const dates = [...byDate.keys()].filter((d) => d <= today).sort();
  const first = dates[0];
  if (!first) return { current: 0, best: 0, total: 0, since: null, trainedToday: false };
  let run = 0;
  let best = 0;
  let total = 0;
  for (let d = first; d <= today; d = addDays(d, 1)) {
    const log = byDate.get(d);
    if (log && isWorkoutDay(log)) {
      run++;
      total++;
      best = Math.max(best, run);
      continue;
    }
    const tpl = log?.templateId ?? scheduledTemplate(d);
    if (tpl === 'REST') continue; // gym closed or planned rest: never breaks the streak
    if (d === today) continue; // still time to train today
    run = 0;
  }
  const t = byDate.get(today);
  return { current: run, best, total, since: first, trainedToday: !!t && isWorkoutDay(t) };
}

export type TierId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'apex';

export interface Tier {
  id: TierId;
  name: string;
  /** Best streak (workouts in a row) needed to unlock. */
  min: number;
  blurb: string;
}

/** Six days a week, so 6 workouts in a row is one clean week. */
export const TIERS: Tier[] = [
  { id: 'bronze', name: 'Bronze', min: 0, blurb: 'Every streak starts here.' },
  { id: 'silver', name: 'Silver', min: 6, blurb: 'One clean week. 6 in a row.' },
  { id: 'gold', name: 'Gold', min: 24, blurb: 'Four straight weeks. 24 in a row.' },
  { id: 'platinum', name: 'Platinum', min: 48, blurb: 'Two months unbroken. 48 in a row.' },
  { id: 'diamond', name: 'Diamond', min: 96, blurb: 'Four months. 96 in a row.' },
  { id: 'apex', name: 'Apex', min: 156, blurb: 'Six months without a miss. The final card.' },
];

/** Card level comes from the best streak, so a missed day never takes a card away. */
export function tierFor(best: number): Tier {
  let t = TIERS[0] as Tier;
  for (const x of TIERS) if (best >= x.min) t = x;
  return t;
}

export function nextTier(t: Tier): Tier | null {
  const i = TIERS.findIndex((x) => x.id === t.id);
  return TIERS[i + 1] ?? null;
}

export function tierIndex(id: TierId): number {
  return TIERS.findIndex((x) => x.id === id);
}

/** Same quote all day, a different one every day, cycling through the whole list before repeating. */
export function quoteFor(dateKey: string, list: readonly string[] = QUOTES): string {
  const n = list.length;
  if (n === 0) return '';
  const day = diffDays('2024-01-01', dateKey);
  // Stepping by a number co-prime with n visits every quote once per cycle, in a scrambled order.
  let step = 7;
  while (gcd(step, n) !== 1) step++;
  const i = (((day * step) % n) + n) % n;
  return list[i] ?? '';
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
