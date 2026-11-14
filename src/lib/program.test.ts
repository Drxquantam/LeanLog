import { afterEach, describe, expect, it } from 'vitest';
import { anchorFrom, applyProgram, applyRotation, applySchedule, carriedFrom, scheduledTemplate, type DayFacts, allPrescriptions, blockItems, exerciseName, isCustomized, isTimed, plannedSetCount, prescriptions } from './program';
import { makeBackup, parseBackup } from './backup';
import { mergeSettings } from './db';

afterEach(() => {
  applyProgram({}, {});
  applyRotation(null);
});

describe('rotation', () => {
  it('starts on the anchor as Chest A and rotates through every gym day, skipping Tuesday', () => {
    applyRotation('2026-11-13');
    const days = ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];
    expect(days.map(scheduledTemplate)).toEqual(['CS-A', 'BB-A', 'LT-A', 'CS-B', 'REST', 'BB-B', 'LT-B', 'CS-A']);
  });
  it('works backwards from the anchor too', () => {
    applyRotation('2026-11-13');
    expect(scheduledTemplate('2026-11-12')).toBe('LT-B');
    expect(scheduledTemplate('2026-11-10')).toBe('REST');
  });
  it('a Tuesday anchor moves to Wednesday', () => {
    expect(anchorFrom('2026-11-17')).toBe('2026-11-18');
    expect(anchorFrom('2026-11-13')).toBe('2026-11-13');
  });
  it('the default anchor keeps the original Monday-first week', () => {
    expect(scheduledTemplate('2026-11-09')).toBe('CS-A');
    expect(scheduledTemplate('2026-11-15')).toBe('LT-B');
  });
});

describe('progress-based schedule', () => {
  const trained = (t: DayFacts['templateId']): DayFacts => ({ templateId: t, trained: true, skipped: false });
  const skipped = (t: DayFacts['templateId']): DayFacts => ({ templateId: t, trained: false, skipped: true });

  it('a missed day carries its workout to the next gym day', () => {
    applyRotation('2026-11-13');
    applySchedule(new Map([['2026-11-13', trained('CS-A')]]), '2026-11-15');
    expect(scheduledTemplate('2026-11-14')).toBe('BB-A'); // missed
    expect(scheduledTemplate('2026-11-15')).toBe('BB-A'); // still waiting today
    expect(carriedFrom('2026-11-15')).toBe('2026-11-14');
    expect(scheduledTemplate('2026-11-16')).toBe('LT-A'); // future continues from today
    expect(scheduledTemplate('2026-11-17')).toBe('REST');
    expect(scheduledTemplate('2026-11-18')).toBe('CS-B');
  });

  it('skipping moves the rotation on', () => {
    applyRotation('2026-11-13');
    applySchedule(new Map([['2026-11-13', trained('CS-A')], ['2026-11-14', skipped('BB-A')]]), '2026-11-15');
    expect(scheduledTemplate('2026-11-14')).toBe('BB-A');
    expect(scheduledTemplate('2026-11-15')).toBe('LT-A');
    expect(carriedFrom('2026-11-15')).toBeNull();
  });

  it('trained days keep their workout and the next day follows it', () => {
    applyRotation('2026-11-13');
    applySchedule(new Map([['2026-11-13', trained('CS-A')], ['2026-11-15', trained('BB-A')]]), '2026-11-16');
    expect(scheduledTemplate('2026-11-14')).toBe('BB-A'); // missed, then done on the 15th
    expect(scheduledTemplate('2026-11-15')).toBe('BB-A');
    expect(scheduledTemplate('2026-11-16')).toBe('LT-A');
  });

  it('training today means tomorrow is the next workout', () => {
    applyRotation('2026-11-13');
    applySchedule(new Map([['2026-11-13', trained('CS-A')]]), '2026-11-13');
    expect(scheduledTemplate('2026-11-14')).toBe('BB-A');
    applySchedule(new Map(), '2026-11-13');
    expect(scheduledTemplate('2026-11-13')).toBe('CS-A');
    expect(scheduledTemplate('2026-11-14')).toBe('BB-A');
  });
});

describe('editable program', () => {
  it('uses defaults until a block is edited', () => {
    expect(isCustomized('CS-A')).toBe(false);
    expect(blockItems('CS-A')[0]?.exerciseId).toBe('flat-db-press');
    expect(plannedSetCount('CS-A')).toBe(25);
  });

  it('an override replaces only that block', () => {
    applyProgram({ 'CS-A': [{ exerciseId: 'flat-db-press', sets: 4, target: '6-8' }] }, {});
    expect(prescriptions('CS-A').main).toEqual([{ exerciseId: 'flat-db-press', sets: 4, target: '6-8' }]);
    expect(prescriptions('CS-A').abs).toHaveLength(3); // abs block untouched
    expect(plannedSetCount('CS-A')).toBe(4 + 9);
    expect(blockItems('BB-A')[0]?.exerciseId).toBe('lat-pulldown');
  });

  it('the abs override applies to every workout with abs', () => {
    applyProgram({ ABS: [{ exerciseId: 'plank', sets: 2, target: '60 sec' }] }, {});
    expect(prescriptions('LT-A').abs).toEqual([{ exerciseId: 'plank', sets: 2, target: '60 sec' }]);
    expect(prescriptions('BB-B').abs).toHaveLength(1);
    expect(prescriptions('BB-A').abs).toHaveLength(0);
  });

  it('custom exercises resolve names and kinds', () => {
    applyProgram({ 'LT-B': [{ exerciseId: 'c-sled-push-1', sets: 3, target: '30 sec' }] }, { 'c-sled-push-1': { id: 'c-sled-push-1', name: 'Sled push', kind: 'timed' } });
    expect(exerciseName('c-sled-push-1')).toBe('Sled push');
    expect(isTimed('c-sled-push-1')).toBe(true);
    expect(allPrescriptions('LT-B').map((p) => p.exerciseId)).toEqual(['c-sled-push-1']);
  });

  it('rest day never has exercises', () => {
    expect(allPrescriptions('REST')).toEqual([]);
  });

  it('program edits survive a backup round-trip and junk is dropped', () => {
    const settings = mergeSettings({
      program: { 'CS-A': [{ exerciseId: 'c-x', sets: 3, target: '8-10' }] },
      customExercises: { 'c-x': { id: 'c-x', name: 'Landmine press', kind: 'reps' } },
    });
    const back = parseBackup(JSON.stringify(makeBackup([], settings)));
    expect(back.settings.program).toEqual(settings.program);
    expect(back.settings.customExercises).toEqual(settings.customExercises);

    const junk = parseBackup(JSON.stringify({ format: 'lean-log-backup', version: 1, logs: [], settings: { program: { NOPE: [], 'BB-A': [{ exerciseId: 5 }, { exerciseId: 'face-pull', sets: 99, target: 'x' }] } } }));
    expect(junk.settings.program).toEqual({ 'BB-A': [{ exerciseId: 'face-pull', sets: 20, target: 'x' }] });
  });
});
