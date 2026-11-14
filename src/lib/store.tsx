import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LogDay, Settings } from './types';
import { DEMO_DB, REAL_DB, deleteDB, loadAll, openDB, readDemoFlag, replaceAll, saveLog, saveSettings, writeDemoFlag } from './db';
import { emptyLog, isEmptyLog } from './logs';
import { loggedSetCount } from './calc';
import { DEFAULT_SETTINGS, allPrescriptions, anchorFrom, applyProgram, applyRotation, applySchedule, dateRotation, scheduledTemplate, type DayFacts } from './program';
import { generateSample } from './sample';
import { addDays, todayKey } from './date';

interface StoreValue {
  ready: boolean;
  demo: boolean;
  logs: LogDay[];
  byDate: Map<string, LogDay>;
  settings: Settings;
  getLog: (date: string) => LogDay;
  updateLog: (date: string, fn: (l: LogDay) => LogDay) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setDemo: (on: boolean) => Promise<void>;
  replaceData: (logs: LogDay[], settings: Settings) => Promise<void>;
  /** Recompute the rotation for a new calendar day (called at midnight). */
  setToday: (today: string) => void;
  storageError: string | null;
}

const Ctx = createContext<StoreValue | null>(null);

/** Drop exercise rows that hold nothing beyond the default prescription, so empty days stay unstored. */
function normalize(l: LogDay): LogDay {
  const planned = new Map(allPrescriptions(l.templateId).map((p) => [p.exerciseId, p.sets]));
  const ex: LogDay['ex'] = {};
  for (const [id, sets] of Object.entries(l.ex)) {
    const blank = sets.every((s) => s.w === null && s.r === null);
    if (blank && (planned.get(id) ?? 0) === sets.length) continue;
    if (blank && !planned.has(id)) continue;
    ex[id] = sets;
  }
  return { ...l, ex };
}

/** Bump when the way days get their workout changes; older data is re-labelled once on load. */
const SCHEDULE_VERSION = 2;

/**
 * Run the progress-based schedule over the log and give every day the workout it assigns.
 * Trained days keep their workout; missed days carry it forward; skipped days move on.
 */
function reschedule(map: Map<string, LogDay>, today: string): Map<string, LogDay> {
  const facts = new Map<string, DayFacts>();
  for (const [d, l] of map) {
    facts.set(d, { templateId: l.templateId, trained: l.templateId !== 'REST' && (l.done || loggedSetCount(l) > 0), skipped: l.skipped });
  }
  applySchedule(facts, today);
  let changed = false;
  const out = new Map<string, LogDay>();
  for (const [d, l] of map) {
    const t = scheduledTemplate(d);
    if (t !== l.templateId) {
      changed = true;
      out.set(d, { ...l, templateId: t });
    } else out.set(d, l);
  }
  return changed ? out : map;
}

/**
 * Apply program edits and the rotation. The rotation starts as CS-A on the first day anything was
 * logged (or today). Data from before the current schedule version is re-labelled by date once,
 * so every trained day gets a stable workout to build on.
 */
function prepare(logs: LogDay[], settings: Settings): { map: Map<string, LogDay>; settings: Settings; migrated: LogDay[] | null; settingsChanged: boolean } {
  const first = [...logs].map((l) => l.date).sort()[0];
  const anchor = settings.rotationStart ?? anchorFrom(first ?? todayKey());
  applyRotation(anchor);
  applyProgram(settings.program, settings.customExercises);
  const needsMigration = settings.scheduleVersion < SCHEDULE_VERSION;
  const cleaned = logs.map((l) => ({ ...l, skipped: l.skipped === true, templateId: needsMigration ? dateRotation(l.date) : l.templateId }));
  const map = reschedule(new Map(cleaned.map((l) => [l.date, l])), todayKey());
  const next = { ...settings, rotationStart: anchor, scheduleVersion: SCHEDULE_VERSION };
  return {
    map,
    settings: next,
    migrated: needsMigration ? [...map.values()] : null,
    settingsChanged: settings.rotationStart !== anchor || needsMigration,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [demo, setDemoState] = useState<boolean>(readDemoFlag);
  const [ready, setReady] = useState(false);
  const [map, setMap] = useState<Map<string, LogDay>>(new Map());
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [storageError, setStorageError] = useState<string | null>(null);
  const mapRef = useRef(map);
  mapRef.current = map;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const dbName = demo ? DEMO_DB : REAL_DB;

  useEffect(() => {
    let alive = true;
    setReady(false);
    const db = openDB(dbName);
    (async () => {
      try {
        let data = await loadAll(db);
        if (dbName === DEMO_DB && data.logs.length === 0) {
          const demoSettings = { ...DEFAULT_SETTINGS, rotationStart: anchorFrom(addDays(todayKey(), -70)) };
          applyRotation(demoSettings.rotationStart);
          const logs = generateSample(todayKey());
          await replaceAll(db, logs, demoSettings);
          data = { logs, settings: demoSettings };
        }
        if (!alive) return;
        const ready = prepare(data.logs, data.settings);
        if (ready.migrated) await db.logs.bulkPut(ready.migrated);
        if (ready.settingsChanged) await saveSettings(db, ready.settings);
        mapRef.current = ready.map;
        setMap(ready.map);
        settingsRef.current = ready.settings;
        setSettings(ready.settings);
      } catch (e) {
        setStorageError(e instanceof Error ? e.message : 'Storage is unavailable');
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [dbName]);

  const persistErr = useCallback((e: unknown) => setStorageError(e instanceof Error ? e.message : 'Could not save'), []);

  const getLog = useCallback((date: string) => mapRef.current.get(date) ?? emptyLog(date), []);

  const updateLog = useCallback(
    (date: string, fn: (l: LogDay) => LogDay) => {
      const prev = mapRef.current.get(date) ?? emptyLog(date);
      // A day's workout always comes from the rotation, never from what was stored before.
      const next = normalize({ ...fn(prev), templateId: scheduledTemplate(date) });
      const empty = isEmptyLog(next);
      const raw = new Map(mapRef.current);
      if (empty) raw.delete(date);
      else raw.set(date, next);
      // Training, skipping or clearing a day can shift which workout later days get.
      const m = reschedule(raw, todayKey());
      mapRef.current = m;
      setMap(m);
      saveLog(openDB(dbName), empty ? null : next, date).catch(persistErr);
    },
    [dbName, persistErr],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const next = { ...settingsRef.current, ...patch };
      settingsRef.current = next;
      applyProgram(next.program, next.customExercises);
      applyRotation(next.rotationStart);
      const m = reschedule(mapRef.current, todayKey());
      mapRef.current = m;
      setMap(m);
      setSettings(next);
      saveSettings(openDB(dbName), next).catch(persistErr);
    },
    [dbName, persistErr],
  );

  const setDemo = useCallback(async (on: boolean) => {
    if (on) await deleteDB(DEMO_DB).catch(() => undefined); // fresh sample each time
    setStorageError(null);
    writeDemoFlag(on);
    setDemoState(on);
  }, []);

  const replaceData = useCallback(
    async (logs: LogDay[], s: Settings) => {
      const ready = prepare(logs, s);
      await replaceAll(openDB(dbName), [...ready.map.values()], ready.settings);
      mapRef.current = ready.map;
      setMap(ready.map);
      settingsRef.current = ready.settings;
      setSettings(ready.settings);
    },
    [dbName],
  );

  const setToday = useCallback((today: string) => {
    const m = reschedule(mapRef.current, today);
    mapRef.current = m;
    setMap(new Map(m)); // new identity so screens re-read the schedule
  }, []);

  const logs = useMemo(() => [...map.values()].sort((a, b) => a.date.localeCompare(b.date)), [map]);

  const value = useMemo<StoreValue>(
    () => ({ ready, demo, logs, byDate: map, settings, getLog, updateLog, updateSettings, setDemo, replaceData, setToday, storageError }),
    [ready, demo, logs, map, settings, getLog, updateLog, updateSettings, setDemo, replaceData, setToday, storageError],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}

/** Re-render at local midnight so "today" never goes stale while the app stays open. */
export function useToday(): string {
  const [t, setT] = useState(todayKey);
  useEffect(() => {
    const id = window.setInterval(() => {
      const k = todayKey();
      setT((prev) => (prev === k ? prev : k));
    }, 30_000);
    const onVis = () => setT(todayKey());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return t;
}
