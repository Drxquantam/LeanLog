/** Pure helpers over LogDay records. */
import type { LogDay, SetEntry, TemplateId } from './types';
import { addDays, startOfWeek } from './date';
import { isLogged, loggedSetCount } from './calc';
import { rotationStartDate, scheduledTemplate } from './program';

export function emptyLog(date: string, templateId: TemplateId = scheduledTemplate(date)): LogDay {
  return {
    date,
    templateId,
    done: false,
    skipped: false,
    ex: {},
    hiit: { done: false, min: null, rounds: null, rpe: null, machine: null },
    walk: { done: false, min: null, incline: null },
    steps: null,
    cal: null,
    protein: null,
    weight: null,
    notes: '',
  };
}

/** True when the record holds nothing the user entered (so it need not be stored). */
export function isEmptyLog(l: LogDay): boolean {
  return (
    Object.keys(l.ex).length === 0 &&
    !l.done &&
    !l.skipped &&
    l.templateId === scheduledTemplate(l.date) &&
    !l.hiit.done && l.hiit.min === null && l.hiit.rounds === null && l.hiit.rpe === null && l.hiit.machine === null &&
    !l.walk.done && l.walk.min === null && l.walk.incline === null &&
    l.steps === null && l.cal === null && l.protein === null && l.weight === null &&
    l.notes.trim() === ''
  );
}

export interface Session {
  date: string;
  sets: SetEntry[];
}

/** Sessions with at least one logged set for an exercise, oldest first. */
export function sessionsFor(logs: LogDay[], exerciseId: string, before?: string): Session[] {
  const out: Session[] = [];
  for (const l of logs) {
    if (before !== undefined && l.date >= before) continue;
    const sets = l.ex[exerciseId];
    if (!sets) continue;
    const logged = sets.filter(isLogged);
    if (logged.length) out.push({ date: l.date, sets: logged });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function lastSession(logs: LogDay[], exerciseId: string, before: string): Session | null {
  const s = sessionsFor(logs, exerciseId, before);
  return s[s.length - 1] ?? null;
}

export type DayStatus = 'done' | 'partial' | 'planned' | 'missed' | 'skipped' | 'rest';

export function dayStatus(date: string, log: LogDay | undefined, today: string): DayStatus {
  const tpl = log?.templateId ?? scheduledTemplate(date);
  const sets = loggedSetCount(log);
  if (log?.done) return 'done';
  if (tpl === 'REST') return 'rest';
  if (sets > 0) return 'partial';
  if (log?.skipped) return 'skipped';
  if (date >= today) return 'planned';
  if (!log && date < rotationStartDate()) return 'rest'; // before you started: not a miss
  return 'missed';
}

/** A day counts as a workout once it has logged sets or was finished. */
export function isWorkoutDay(l: LogDay): boolean {
  return l.templateId !== 'REST' && (l.done || loggedSetCount(l) > 0);
}

export interface WeekCount {
  week: string;
  count: number;
}

/** Count per Monday-start week for the last `weeks` weeks ending with the week of `today`. */
export function perWeek(logs: LogDay[], today: string, weeks: number, pred: (l: LogDay) => boolean): WeekCount[] {
  const thisWeek = startOfWeek(today);
  const out: WeekCount[] = [];
  for (let i = weeks - 1; i >= 0; i--) out.push({ week: addDays(thisWeek, -7 * i), count: 0 });
  for (const l of logs) {
    if (!pred(l)) continue;
    const w = startOfWeek(l.date);
    const bucket = out.find((b) => b.week === w);
    if (bucket) bucket.count++;
  }
  return out;
}

/** Next non-rest workout strictly after `from`, honouring swaps already saved for future days. */
export function nextWorkout(from: string, byDate: Map<string, LogDay>): { date: string; templateId: TemplateId } | null {
  for (let i = 1; i <= 14; i++) {
    const d = addDays(from, i);
    const tpl = byDate.get(d)?.templateId ?? scheduledTemplate(d);
    if (tpl !== 'REST') return { date: d, templateId: tpl };
  }
  return null;
}
