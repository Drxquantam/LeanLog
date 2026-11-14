import { useMemo } from 'react';
import { useStore } from './store';
import { streakStats, tierFor, type StreakStats, type Tier } from './streak';
import { isWorkoutDay } from './logs';
import { startOfWeek } from './date';

export interface CardData extends StreakStats {
  tier: Tier;
  week: number;
}

/** Streak, tier and this week's workout count, derived from the log. */
export function useCard(today: string): CardData {
  const { byDate } = useStore();
  return useMemo(() => {
    const s = streakStats(byDate, today);
    const monday = startOfWeek(today);
    let week = 0;
    for (const [d, l] of byDate) if (d >= monday && d <= today && isWorkoutDay(l)) week++;
    return { ...s, tier: tierFor(s.best), week };
  }, [byDate, today]);
}
