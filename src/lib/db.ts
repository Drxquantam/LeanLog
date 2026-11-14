import Dexie, { type Table } from 'dexie';
import type { LogDay, Settings } from './types';
import { DEFAULT_SETTINGS } from './program';

interface KV {
  key: string;
  value: Settings;
}

export class LeanLogDB extends Dexie {
  logs!: Table<LogDay, string>;
  kv!: Table<KV, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ logs: 'date', kv: 'key' });
  }
}

/** Real data and demo data live in separate databases, so demo mode can never touch real logs. */
export const REAL_DB = 'lean-log';
export const DEMO_DB = 'lean-log-demo';

const cache = new Map<string, LeanLogDB>();
export function openDB(name: string): LeanLogDB {
  let db = cache.get(name);
  if (!db) {
    db = new LeanLogDB(name);
    cache.set(name, db);
  }
  return db;
}

export async function deleteDB(name: string): Promise<void> {
  const db = cache.get(name) ?? new LeanLogDB(name);
  cache.delete(name);
  await db.delete();
}

export function mergeSettings(s: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...(s ?? {}), baselines: { ...DEFAULT_SETTINGS.baselines, ...(s?.baselines ?? {}) } };
}

export async function loadAll(db: LeanLogDB): Promise<{ logs: LogDay[]; settings: Settings }> {
  const [logs, kv] = await Promise.all([db.logs.toArray(), db.kv.get('settings')]);
  return { logs, settings: mergeSettings(kv?.value) };
}

export async function saveLog(db: LeanLogDB, log: LogDay | null, date: string): Promise<void> {
  if (log === null) await db.logs.delete(date);
  else await db.logs.put(log);
}

export async function saveSettings(db: LeanLogDB, s: Settings): Promise<void> {
  await db.kv.put({ key: 'settings', value: s });
}

export async function replaceAll(db: LeanLogDB, logs: LogDay[], settings: Settings): Promise<void> {
  await db.transaction('rw', db.logs, db.kv, async () => {
    await db.logs.clear();
    await db.logs.bulkPut(logs);
    await db.kv.put({ key: 'settings', value: settings });
  });
}

const MODE_KEY = 'leanlog.demo';
export function readDemoFlag(): boolean {
  try {
    return localStorage.getItem(MODE_KEY) === '1';
  } catch {
    return false;
  }
}
export function writeDemoFlag(on: boolean): void {
  try {
    localStorage.setItem(MODE_KEY, on ? '1' : '0');
  } catch {
    /* storage unavailable: mode simply won't persist */
  }
}
