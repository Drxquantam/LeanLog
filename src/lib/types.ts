export type TemplateId = 'CS-A' | 'BB-A' | 'LT-A' | 'CS-B' | 'BB-B' | 'LT-B' | 'REST';

/** One set. `w` = kg (null for bodyweight), `r` = reps, or seconds for timed exercises. */
export interface SetEntry {
  w: number | null;
  r: number | null;
}

export interface HiitLog {
  done: boolean;
  min: number | null;
  rounds: number | null;
  rpe: number | null;
  machine: Machine | null;
}

export type Machine = 'bike' | 'rower' | 'treadmill';

export interface WalkLog {
  done: boolean;
  min: number | null;
  incline: number | null;
}

export interface LogDay {
  /** YYYY-MM-DD, local time. Primary key. */
  date: string;
  templateId: TemplateId;
  done: boolean;
  /** Chose to skip this workout: the rotation moves on to the next one. */
  skipped: boolean;
  ex: Record<string, SetEntry[]>;
  hiit: HiitLog;
  walk: WalkLog;
  steps: number | null;
  cal: number | null;
  protein: number | null;
  weight: number | null;
  notes: string;
}

export interface Baseline {
  w: number;
  r: number;
}

export interface Settings {
  steps: number;
  cal: number;
  protein: number;
  startWeight: number;
  heightCm: number;
  goalWeight: number;
  baselines: Record<string, Baseline>;
  restTimer: boolean;
  restSeconds: number;
  /** Name printed on the gym card. */
  name: string;
  /** Highest card tier whose unlock animation has been shown. */
  seenTier: string;
  /** User edits to the program. A key present here replaces that block's default exercises. */
  program: ProgramOverrides;
  /** Exercises the user created. */
  customExercises: Record<string, Exercise>;
  /** The day the workout rotation starts (a CS-A day). Set automatically on first use. */
  rotationStart: string | null;
  /** Internal: version of the scheduling rules the stored days were labelled with. */
  scheduleVersion: number;
}

/** Editable blocks: each workout template plus the shared abs block. */
export type BlockId = Exclude<TemplateId, 'REST'> | 'ABS';
export type ProgramOverrides = Partial<Record<BlockId, Prescription[]>>;

export type ExerciseKind = 'reps' | 'timed';

export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  /** Bodyweight movements hide or de-emphasise the kg field. */
  bodyweight?: boolean;
}

export interface Prescription {
  exerciseId: string;
  sets: number;
  /** e.g. "8-10", "10 each side", "40 sec", "max time" */
  target: string;
}

export interface Template {
  id: TemplateId;
  code: 'CS' | 'BB' | 'LT' | 'OFF';
  name: string;
  short: string;
  items: Prescription[];
  abs: boolean;
  cardio: CardioPlan;
}

export type CardioPlan = 'hiit' | 'incline' | 'easy-walk' | 'none';
