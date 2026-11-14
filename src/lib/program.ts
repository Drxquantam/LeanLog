import type { BlockId, Exercise, Prescription, ProgramOverrides, Settings, Template, TemplateId } from './types';
import { addDays, diffDays, weekdayMon } from './date';

const ex = (id: string, name: string, extra: Partial<Exercise> = {}): Exercise => ({ id, name, kind: 'reps', ...extra });

/** Exercise library. Shared ids let history flow across A and B days. */
export const EXERCISES: Record<string, Exercise> = Object.fromEntries(
  [
    ex('flat-db-press', 'Flat DB press'),
    ex('incline-db-press', 'Incline DB press'),
    ex('cable-fly', 'Cable / pec-deck fly'),
    ex('seated-db-shoulder-press', 'Seated DB shoulder press'),
    ex('lateral-raise', 'Lateral raise'),
    ex('rear-delt-fly', 'Rear-delt fly'),
    ex('lat-pulldown', 'Lat pulldown'),
    ex('seated-cable-row', 'Seated cable row'),
    ex('one-arm-db-row', 'One-arm DB row'),
    ex('face-pull', 'Face pull'),
    ex('db-curl', 'DB curl'),
    ex('hammer-curl', 'Hammer curl'),
    ex('reverse-curl', 'Reverse curl'),
    ex('wrist-curl', 'Wrist curl'),
    ex('squat-or-leg-press', 'Squat or leg press'),
    ex('romanian-deadlift', 'Romanian deadlift'),
    ex('walking-lunge', 'Walking lunges'),
    ex('leg-curl', 'Leg curl'),
    ex('standing-calf-raise', 'Standing calf raise'),
    ex('rope-pushdown', 'Rope pushdown'),
    ex('overhead-db-extension', 'Overhead DB triceps extension'),
    ex('machine-or-flat-press', 'Machine or flat DB press'),
    ex('cable-crossover', 'Cable crossover'),
    ex('arnold-press', 'Arnold press'),
    ex('farmers-carry', 'Farmer’s carry', { kind: 'timed' }),
    ex('assisted-pullup', 'Assisted pull-up / wide pulldown'),
    ex('barbell-row', 'Barbell or T-bar row'),
    ex('close-grip-pulldown', 'Close-grip pulldown'),
    ex('straight-arm-pulldown', 'Straight-arm pulldown'),
    ex('incline-db-curl', 'Incline DB curl'),
    ex('cable-curl', 'Cable curl'),
    ex('reverse-wrist-curl', 'Reverse wrist curl'),
    ex('dead-hang', 'Dead hang', { kind: 'timed', bodyweight: true }),
    ex('leg-press', 'Leg press'),
    ex('bulgarian-split-squat', 'Bulgarian split squat'),
    ex('hip-thrust', 'Hip thrust / back extension'),
    ex('leg-extension', 'Leg extension'),
    ex('seated-calf-raise', 'Seated calf raise'),
    ex('skull-crusher', 'Skull crushers'),
    ex('triceps-pushdown', 'Triceps pushdown'),
    ex('hanging-leg-raise', 'Hanging leg raise', { bodyweight: true }),
    ex('cable-crunch', 'Cable crunch'),
    ex('plank', 'Plank', { kind: 'timed', bodyweight: true }),
  ].map((e) => [e.id, e]),
);

const p = (exerciseId: string, sets: number, target: string): Prescription => ({ exerciseId, sets, target });

export const ABS_BLOCK: Prescription[] = [p('hanging-leg-raise', 3, '10-15'), p('cable-crunch', 3, '12-15'), p('plank', 3, '45 sec')];

export const TEMPLATES: Record<TemplateId, Template> = {
  'CS-A': {
    id: 'CS-A', code: 'CS', short: 'CS-A', name: 'Chest & Shoulders A', abs: true, cardio: 'hiit',
    items: [
      p('flat-db-press', 3, '8-10'), p('incline-db-press', 3, '10-12'), p('cable-fly', 2, '12-15'),
      p('seated-db-shoulder-press', 3, '8-10'), p('lateral-raise', 3, '12-15'), p('rear-delt-fly', 2, '15'),
    ],
  },
  'BB-A': {
    id: 'BB-A', code: 'BB', short: 'BB-A', name: 'Back, Biceps & Forearms A', abs: false, cardio: 'incline',
    items: [
      p('lat-pulldown', 3, '8-10'), p('seated-cable-row', 3, '10-12'), p('one-arm-db-row', 3, '10 each side'),
      p('face-pull', 2, '12-15'), p('db-curl', 3, '10-12'), p('hammer-curl', 2, '12'),
      p('reverse-curl', 3, '10-12'), p('wrist-curl', 3, '15-20'),
    ],
  },
  'LT-A': {
    id: 'LT-A', code: 'LT', short: 'LT-A', name: 'Legs & Triceps A', abs: true, cardio: 'none',
    items: [
      p('squat-or-leg-press', 3, '8-10'), p('romanian-deadlift', 3, '8-10'), p('walking-lunge', 3, '10 each leg'),
      p('leg-curl', 3, '10-12'), p('standing-calf-raise', 4, '12-15'), p('rope-pushdown', 3, '10-12'),
      p('overhead-db-extension', 3, '10-12'),
    ],
  },
  'CS-B': {
    id: 'CS-B', code: 'CS', short: 'CS-B', name: 'Chest, Shoulders & Forearms B', abs: false, cardio: 'hiit',
    items: [
      p('incline-db-press', 3, '8-10'), p('machine-or-flat-press', 3, '10-12'), p('cable-crossover', 3, '12-15'),
      p('arnold-press', 3, '10'), p('lateral-raise', 4, '15'), p('face-pull', 2, '15'), p('farmers-carry', 3, '40 sec'),
    ],
  },
  'BB-B': {
    id: 'BB-B', code: 'BB', short: 'BB-B', name: 'Back, Biceps & Forearms B', abs: true, cardio: 'incline',
    items: [
      p('assisted-pullup', 3, '6-10'), p('barbell-row', 3, '8-10'), p('close-grip-pulldown', 3, '10-12'),
      p('straight-arm-pulldown', 2, '12-15'), p('incline-db-curl', 3, '10-12'), p('cable-curl', 2, '12-15'),
      p('reverse-wrist-curl', 3, '15-20'), p('dead-hang', 2, 'max time'),
    ],
  },
  'LT-B': {
    id: 'LT-B', code: 'LT', short: 'LT-B', name: 'Legs, Triceps & Forearms B', abs: false, cardio: 'none',
    items: [
      p('leg-press', 3, '10-12'), p('bulgarian-split-squat', 3, '8-10 each leg'), p('hip-thrust', 3, '10-12'),
      p('leg-extension', 3, '12-15'), p('seated-calf-raise', 4, '15'), p('skull-crusher', 3, '10'),
      p('triceps-pushdown', 3, '12-15'), p('wrist-curl', 2, '20'), p('reverse-wrist-curl', 2, '20'),
    ],
  },
  REST: {
    id: 'REST', code: 'OFF', short: 'Rest', name: 'Rest day', abs: false, cardio: 'easy-walk', items: [],
  },
};

export const TEMPLATE_ORDER: TemplateId[] = ['CS-A', 'BB-A', 'LT-A', 'CS-B', 'BB-B', 'LT-B', 'REST'];


/* ---- Rotation ----
 * Workouts rotate CS-A → BB-A → LT-A → CS-B → BB-B → LT-B on every gym day; Tuesday is always closed.
 * The rotation is anchored so that `anchor` is a CS-A day. The default anchor (Monday 1 Jan 2024)
 * reproduces the original Monday-first week; the app sets the real anchor to the first workout day. */
export const ROTATION: TemplateId[] = ['CS-A', 'BB-A', 'LT-A', 'CS-B', 'BB-B', 'LT-B'];
const EPOCH = '2024-01-01'; // a Monday
let rotationAnchor = EPOCH;
let schedule: { today: string; slots: Map<string, number>; futureStart: number } | null = null;

/** Counts gym days (every day except Tuesday) since EPOCH. */
function gymDayIndex(dateKey: string): number {
  const days = diffDays(EPOCH, dateKey);
  const week = Math.floor(days / 7);
  const wd = weekdayMon(dateKey);
  return week * 6 + (wd === 0 ? 0 : wd - 1);
}

export function isClosedDay(dateKey: string): boolean {
  return weekdayMon(dateKey) === 1;
}

/** Use `anchor` (a non-Tuesday) as a CS-A day. Pass null to restore the default week. */
export function applyRotation(anchor: string | null | undefined): void {
  rotationAnchor = anchor && !isClosedDay(anchor) ? anchor : EPOCH;
  schedule = null;
}

/** The first day of the user's rotation (nothing before it counts as missed). */
export function rotationStartDate(): string {
  return rotationAnchor;
}

/** First valid rotation anchor on or after a date (skips Tuesday). */
export function anchorFrom(dateKey: string): string {
  return isClosedDay(dateKey) ? addDays(dateKey, 1) : dateKey;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Pure date-based rotation: the anchor is CS-A and every gym day moves one step. */
export function dateRotation(dateKey: string): TemplateId {
  if (isClosedDay(dateKey)) return 'REST';
  return ROTATION[mod(gymDayIndex(dateKey) - gymDayIndex(rotationAnchor), ROTATION.length)] ?? 'CS-A';
}

/** What happened on a day, as far as the rotation cares. */
export interface DayFacts {
  templateId: TemplateId;
  trained: boolean;
  skipped: boolean;
}

/*
 * Progress-based schedule (pick up where you left off):
 *  - a day you trained keeps its workout for good, and the next gym day gets the following one;
 *  - a day you skipped also moves the rotation on;
 *  - a gym day you missed does NOT move it on, so the same workout waits for you next time;
 *  - future days are projected as if you train every gym day from today.
 */

export function applySchedule(days: Map<string, DayFacts>, today: string): void {
  const slots = new Map<string, number>();
  let slot = 0;
  let consumedToday = false;
  if (rotationAnchor <= today) {
    for (let d = rotationAnchor; d <= today; d = addDays(d, 1)) {
      if (isClosedDay(d)) continue;
      const f = days.get(d);
      const frozen = f?.trained ? ROTATION.indexOf(f.templateId) : -1;
      if (frozen >= 0) slot = frozen;
      slots.set(d, mod(slot, ROTATION.length));
      if (f && (f.trained || f.skipped)) {
        slot++;
        if (d === today) consumedToday = true;
      }
    }
  }
  const todayIsGym = !isClosedDay(today) && rotationAnchor <= today;
  schedule = { today, slots, futureStart: todayIsGym && !consumedToday ? slot + 1 : slot };
}

export function scheduledTemplate(dateKey: string): TemplateId {
  if (isClosedDay(dateKey)) return 'REST';
  if (!schedule || dateKey < rotationAnchor) return dateRotation(dateKey);
  if (dateKey <= schedule.today) return ROTATION[schedule.slots.get(dateKey) ?? 0] ?? 'CS-A';
  // Gym days strictly after today up to this date, each assumed trained.
  const ahead = gymDayIndex(dateKey) - gymDayIndex(schedule.today);
  return ROTATION[mod(schedule.futureStart + ahead - 1, ROTATION.length)] ?? 'CS-A';
}

/** True when a past gym day's workout was missed and carried forward to the next gym day. */
export function carriedFrom(dateKey: string): string | null {
  if (!schedule || isClosedDay(dateKey) || dateKey < rotationAnchor) return null;
  let d = addDays(dateKey, -1);
  while (isClosedDay(d)) d = addDays(d, -1);
  if (d < rotationAnchor || !schedule.slots.has(d)) return null;
  return schedule.slots.get(d) === schedule.slots.get(dateKey) ? d : null;
}

/* ---- User edits ----
 * The store calls applyProgram() whenever settings load or change, before React re-renders,
 * so every helper below always reflects the user's current program. */
let overrides: ProgramOverrides = {};
let customExercises: Record<string, Exercise> = {};

export function applyProgram(o: ProgramOverrides | undefined, custom: Record<string, Exercise> | undefined): void {
  overrides = o ?? {};
  customExercises = custom ?? {};
}

export function defaultBlock(id: BlockId): Prescription[] {
  return id === 'ABS' ? ABS_BLOCK : TEMPLATES[id].items;
}

export function blockItems(id: BlockId): Prescription[] {
  return overrides[id] ?? defaultBlock(id);
}

export function isCustomized(id: BlockId): boolean {
  return overrides[id] !== undefined;
}

export function getExercise(id: string): Exercise | undefined {
  return customExercises[id] ?? EXERCISES[id];
}

/** Built-in and user-created exercises, alphabetical. */
export function allExercises(): Exercise[] {
  return [...Object.values(EXERCISES), ...Object.values(customExercises)].sort((a, b) => a.name.localeCompare(b.name));
}

/** Prescriptions for a template, split into the main block and the abs block. */
export function prescriptions(id: TemplateId): { main: Prescription[]; abs: Prescription[] } {
  const t = TEMPLATES[id];
  if (id === 'REST') return { main: [], abs: [] };
  return { main: blockItems(id), abs: t.abs ? blockItems('ABS') : [] };
}

export function allPrescriptions(id: TemplateId): Prescription[] {
  const { main, abs } = prescriptions(id);
  return [...main, ...abs];
}

export function plannedSetCount(id: TemplateId): number {
  return allPrescriptions(id).reduce((n, p) => n + p.sets, 0);
}

export function exerciseName(id: string): string {
  return getExercise(id)?.name ?? id;
}

export function isTimed(id: string): boolean {
  return getExercise(id)?.kind === 'timed';
}

export function cardioLabel(id: TemplateId): string {
  const c = TEMPLATES[id].cardio;
  return c === 'hiit' ? 'HIIT 15 min' : c === 'incline' ? 'Incline walk' : c === 'easy-walk' ? 'Easy walk' : '';
}

export const DEFAULT_SETTINGS: Settings = {
  steps: 10_000,
  cal: 2_400,
  protein: 170,
  startWeight: 100,
  heightCm: 183,
  goalWeight: 88,
  baselines: { 'flat-db-press': { w: 20, r: 10 } },
  restTimer: true,
  restSeconds: 90,
  name: 'Athlete',
  seenTier: 'bronze',
  program: {},
  customExercises: {},
  rotationStart: null,
  scheduleVersion: 0,
};
