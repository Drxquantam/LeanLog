/** Demo data generator. Only ever written to the separate demo database. */
import type { LogDay, Machine, SetEntry } from './types';
import { addDays, diffDays } from './date';
import { allPrescriptions, isTimed, scheduledTemplate } from './program';
import { emptyLog } from './logs';

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Starting working weights (kg) for the demo lifter. */
const BASE: Record<string, number> = {
  'flat-db-press': 20, 'incline-db-press': 18, 'cable-fly': 15, 'seated-db-shoulder-press': 16, 'lateral-raise': 8,
  'rear-delt-fly': 6, 'lat-pulldown': 55, 'seated-cable-row': 50, 'one-arm-db-row': 26, 'face-pull': 20, 'db-curl': 12,
  'hammer-curl': 12, 'reverse-curl': 15, 'wrist-curl': 20, 'squat-or-leg-press': 80, 'romanian-deadlift': 60,
  'walking-lunge': 14, 'leg-curl': 40, 'standing-calf-raise': 60, 'rope-pushdown': 25, 'overhead-db-extension': 18,
  'machine-or-flat-press': 50, 'cable-crossover': 12.5, 'arnold-press': 14, 'farmers-carry': 24, 'assisted-pullup': 50,
  'barbell-row': 50, 'close-grip-pulldown': 50, 'straight-arm-pulldown': 20, 'incline-db-curl': 10, 'cable-curl': 15,
  'reverse-wrist-curl': 10, 'leg-press': 120, 'bulgarian-split-squat': 12, 'hip-thrust': 60, 'leg-extension': 40,
  'seated-calf-raise': 40, 'skull-crusher': 20, 'triceps-pushdown': 25, 'cable-crunch': 35,
};

const lowRep = (target: string): number => Number(/(\d+)/.exec(target)?.[1] ?? '10');
const highRep = (target: string): number => Number(/\d+-(\d+)/.exec(target)?.[1] ?? lowRep(target));

export function generateSample(today: string, weeks = 10): LogDay[] {
  const rand = rng(42);
  const start = addDays(today, -weeks * 7);
  const logs: LogDay[] = [];
  const machines: Machine[] = ['bike', 'rower', 'treadmill'];

  for (let d = start; d < today; d = addDays(d, 1)) {
    const tpl = scheduledTemplate(d);
    const log = emptyLog(d, tpl);
    const day = diffDays(start, d);
    const progress = day / (weeks * 7);
    const skipped = tpl !== 'REST' && rand() < 0.07;

    if (tpl !== 'REST' && !skipped) {
      const partial = rand() < 0.06;
      const items = allPrescriptions(tpl);
      items.forEach((p, idx) => {
        if (partial && idx > items.length / 2) return;
        const timed = isTimed(p.exerciseId);
        const base = BASE[p.exerciseId] ?? 0;
        const bump = base >= 40 ? 5 : base >= 15 ? 2.5 : 1;
        const w = base > 0 ? base + Math.floor(progress * 3 + rand() * 0.6) * bump : null;
        const sets: SetEntry[] = [];
        for (let i = 0; i < p.sets; i++) {
          if (timed) {
            const secs = p.exerciseId === 'dead-hang' ? 30 + Math.round(progress * 20 + rand() * 8) : p.exerciseId === 'plank' ? 45 + Math.round(rand() * 15) : 40;
            sets.push({ w: p.exerciseId === 'farmers-carry' ? w : null, r: secs });
          } else {
            const hi = highRep(p.target);
            const lo = lowRep(p.target);
            const r = Math.max(lo - 1, Math.min(hi, hi - i - Math.round(rand() * 1.5)));
            sets.push({ w: p.exerciseId === 'hanging-leg-raise' ? null : w, r });
          }
        }
        log.ex[p.exerciseId] = sets;
      });
      log.done = !partial;
    }

    const cardio = tpl === 'CS-A' || tpl === 'CS-B' ? 'hiit' : tpl === 'BB-A' || tpl === 'BB-B' || tpl === 'REST' ? 'walk' : 'none';
    if (cardio === 'hiit' && !skipped && rand() < 0.85) {
      log.hiit = { done: true, min: 15, rounds: 8 + Math.floor(rand() * 3), rpe: 7 + Math.floor(rand() * 3), machine: machines[Math.floor(rand() * 3)] ?? 'bike' };
    }
    if (cardio === 'walk' && rand() < 0.8) {
      log.walk = tpl === 'REST' ? { done: true, min: 30 + Math.round(rand() * 20), incline: 0 } : { done: true, min: 20 + Math.round(rand() * 10), incline: 8 + Math.round(rand() * 4) };
    }

    log.steps = Math.round(7200 + rand() * 5200);
    log.cal = Math.round(2200 + rand() * 450);
    log.protein = Math.round(145 + rand() * 40);
    if (rand() < 0.8) log.weight = Math.round((100 - progress * 4.4 + (rand() - 0.5) * 1.2) * 10) / 10;
    logs.push(log);
  }
  return logs;
}
