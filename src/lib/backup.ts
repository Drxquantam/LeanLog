/** JSON export / import with strict validation. */
import type { BlockId, HiitLog, LogDay, Machine, ProgramOverrides, SetEntry, Settings, TemplateId, WalkLog } from './types';
import { isValidKey } from './date';
import { TEMPLATE_ORDER } from './program';
import { mergeSettings } from './db';

export const BACKUP_FORMAT = 'lean-log-backup';
export const BACKUP_VERSION = 1;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  settings: Settings;
  logs: LogDay[];
}

export function makeBackup(logs: LogDay[], settings: Settings, now = new Date()): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    settings,
    logs: [...logs].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const bool = (v: unknown): boolean => v === true;
const MACHINES: Machine[] = ['bike', 'rower', 'treadmill'];

function parseSet(v: unknown): SetEntry {
  if (!isObj(v)) throw new Error('Invalid set');
  return { w: num(v.w), r: num(v.r) };
}

function parseHiit(v: unknown): HiitLog {
  const o = isObj(v) ? v : {};
  const m = o.machine;
  return {
    done: bool(o.done),
    min: num(o.min),
    rounds: num(o.rounds),
    rpe: num(o.rpe),
    machine: typeof m === 'string' && (MACHINES as string[]).includes(m) ? (m as Machine) : null,
  };
}

function parseWalk(v: unknown): WalkLog {
  const o = isObj(v) ? v : {};
  return { done: bool(o.done), min: num(o.min), incline: num(o.incline) };
}

export function parseLog(v: unknown): LogDay {
  if (!isObj(v)) throw new Error('Invalid log entry');
  const date = v.date;
  if (typeof date !== 'string' || !isValidKey(date)) throw new Error(`Invalid date: ${String(date)}`);
  const tpl = v.templateId;
  if (typeof tpl !== 'string' || !(TEMPLATE_ORDER as string[]).includes(tpl)) throw new Error(`Invalid workout on ${date}`);
  const ex: Record<string, SetEntry[]> = {};
  if (isObj(v.ex)) {
    for (const [k, sets] of Object.entries(v.ex)) {
      if (!Array.isArray(sets)) throw new Error(`Invalid sets on ${date}`);
      ex[k] = sets.map(parseSet);
    }
  }
  return {
    date,
    templateId: tpl as TemplateId,
    done: bool(v.done),
    skipped: bool(v.skipped),
    ex,
    hiit: parseHiit(v.hiit),
    walk: parseWalk(v.walk),
    steps: num(v.steps),
    cal: num(v.cal),
    protein: num(v.protein),
    weight: num(v.weight),
    notes: typeof v.notes === 'string' ? v.notes : '',
  };
}

function parseSettings(v: unknown): Settings {
  const o = isObj(v) ? v : {};
  const partial: Partial<Settings> = {};
  for (const k of ['steps', 'cal', 'protein', 'startWeight', 'heightCm', 'goalWeight', 'restSeconds'] as const) {
    const n = num(o[k]);
    if (n !== null) partial[k] = n;
  }
  if (typeof o.restTimer === 'boolean') partial.restTimer = o.restTimer;
  if (typeof o.name === 'string') partial.name = o.name.slice(0, 40);
  if (typeof o.seenTier === 'string') partial.seenTier = o.seenTier;
  if (typeof o.rotationStart === 'string' && isValidKey(o.rotationStart)) partial.rotationStart = o.rotationStart;
  if (typeof o.scheduleVersion === 'number') partial.scheduleVersion = o.scheduleVersion;
  if (isObj(o.baselines)) {
    const b: Settings['baselines'] = {};
    for (const [k, val] of Object.entries(o.baselines)) {
      if (isObj(val)) {
        const w = num(val.w);
        const r = num(val.r);
        if (w !== null && r !== null) b[k] = { w, r };
      }
    }
    partial.baselines = b;
  }
  if (isObj(o.customExercises)) {
    const c: Settings['customExercises'] = {};
    for (const [k, val] of Object.entries(o.customExercises)) {
      if (isObj(val) && typeof val.name === 'string' && val.name.trim()) {
        c[k] = { id: k, name: val.name.slice(0, 60), kind: val.kind === 'timed' ? 'timed' : 'reps', ...(val.bodyweight === true ? { bodyweight: true } : {}) };
      }
    }
    partial.customExercises = c;
  }
  if (isObj(o.program)) {
    const prog: ProgramOverrides = {};
    for (const [k, list] of Object.entries(o.program)) {
      if (!(BLOCK_IDS as string[]).includes(k) || !Array.isArray(list)) continue;
      prog[k as BlockId] = list.filter(isObj).flatMap((x) => {
        const sets = num(x.sets);
        return typeof x.exerciseId === 'string' && sets !== null
          ? [{ exerciseId: x.exerciseId, sets: Math.max(1, Math.min(20, Math.round(sets))), target: typeof x.target === 'string' ? x.target.slice(0, 30) : '' }]
          : [];
      });
    }
    partial.program = prog;
  }
  return mergeSettings(partial);
}

const BLOCK_IDS: BlockId[] = ['CS-A', 'BB-A', 'LT-A', 'CS-B', 'BB-B', 'LT-B', 'ABS'];

/** Parse and validate a backup file's text. Throws a readable Error when invalid. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT) throw new Error('This is not a Lean Log backup.');
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) throw new Error('This backup is from a newer version.');
  if (!Array.isArray(raw.logs)) throw new Error('Backup has no logs list.');
  const logs = raw.logs.map(parseLog);
  const seen = new Set<string>();
  for (const l of logs) {
    if (seen.has(l.date)) throw new Error(`Duplicate day ${l.date}.`);
    seen.add(l.date);
  }
  return {
    format: BACKUP_FORMAT,
    version: raw.version,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    settings: parseSettings(raw.settings),
    logs,
  };
}
