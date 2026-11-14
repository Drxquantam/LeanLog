import { describe, expect, it } from 'vitest';
import { dayStatus, emptyLog, isEmptyLog, lastSession, nextWorkout, perWeek, isWorkoutDay } from './logs';
import { makeBackup, parseBackup } from './backup';
import { DEFAULT_SETTINGS, scheduledTemplate } from './program';
import { generateSample } from './sample';
import type { LogDay } from './types';

const withSets = (date: string, ex: LogDay['ex'], extra: Partial<LogDay> = {}): LogDay => ({ ...emptyLog(date), ex, ...extra });

describe('schedule', () => {
  it('Tuesday is always rest, Monday is CS-A', () => {
    expect(scheduledTemplate('2026-11-10')).toBe('REST');
    expect(scheduledTemplate('2026-11-09')).toBe('CS-A');
    expect(scheduledTemplate('2026-11-15')).toBe('LT-B');
  });
  it('next workout skips Tuesday', () => {
    expect(nextWorkout('2026-11-09', new Map())).toEqual({ date: '2026-11-11', templateId: 'BB-A' });
  });
});

describe('records', () => {
  it('an untouched day is empty', () => {
    expect(isEmptyLog(emptyLog('2026-11-13'))).toBe(true);
    expect(isEmptyLog({ ...emptyLog('2026-11-13'), steps: 4000 })).toBe(false);
    expect(isEmptyLog({ ...emptyLog('2026-11-13'), templateId: 'LT-A' })).toBe(false);
  });
  it('lastSession finds the previous logged session before a date', () => {
    const logs = [
      withSets('2026-11-02', { 'flat-db-press': [{ w: 20, r: 10 }] }),
      withSets('2026-11-09', { 'flat-db-press': [{ w: 20, r: 10 }, { w: 20, r: 9 }, { w: 20, r: null }] }),
    ];
    expect(lastSession(logs, 'flat-db-press', '2026-11-16')?.sets).toHaveLength(2);
    expect(lastSession(logs, 'flat-db-press', '2026-11-09')?.date).toBe('2026-11-02');
    expect(lastSession(logs, 'flat-db-press', '2026-11-02')).toBeNull();
  });
  it('day status', () => {
    const today = '2026-11-13';
    expect(dayStatus('2026-11-09', undefined, today)).toBe('missed');
    expect(dayStatus('2026-11-10', undefined, today)).toBe('rest');
    expect(dayStatus('2026-11-16', undefined, today)).toBe('planned');
    expect(dayStatus('2026-11-09', withSets('2026-11-09', { x: [{ w: 1, r: 1 }] }), today)).toBe('partial');
    expect(dayStatus('2026-11-09', withSets('2026-11-09', {}, { done: true }), today)).toBe('done');
  });
  it('perWeek buckets Monday-start weeks', () => {
    const logs = [withSets('2026-11-09', { x: [{ w: 1, r: 1 }] }), withSets('2026-11-13', { x: [{ w: 1, r: 1 }] }), withSets('2026-11-06', {}, { done: true })];
    expect(perWeek(logs, '2026-11-13', 2, isWorkoutDay)).toEqual([
      { week: '2026-11-02', count: 1 },
      { week: '2026-11-09', count: 2 },
    ]);
  });
});

describe('backup', () => {
  it('round-trips sample data', () => {
    const logs = generateSample('2026-11-13', 3);
    const b = parseBackup(JSON.stringify(makeBackup(logs, DEFAULT_SETTINGS)));
    expect(b.logs).toEqual([...logs].sort((a, c) => a.date.localeCompare(c.date)));
    expect(b.settings).toEqual(DEFAULT_SETTINGS);
  });
  it('rejects foreign or broken files', () => {
    expect(() => parseBackup('nope')).toThrow(/JSON/);
    expect(() => parseBackup('{"a":1}')).toThrow(/not a Lean Log/);
    expect(() => parseBackup(JSON.stringify({ format: 'lean-log-backup', version: 1, logs: [{ date: '2026-13-40', templateId: 'CS-A' }] }))).toThrow(/Invalid date/);
  });
  it('sample data never generates future days', () => {
    expect(generateSample('2026-11-13').every((l) => l.date < '2026-11-13')).toBe(true);
  });
});
