import { useMemo, useState } from 'react';
import type { ExerciseKind } from '../lib/types';
import { allExercises } from '../lib/program';
import { useStore } from '../lib/store';
import { Icon } from './Icon';
import { Segmented, Sheet } from './ui';

/** Pick an exercise from the library, or create a new one by name. */
export function ExercisePicker({ open, title, exclude, onClose, onPick }: {
  open: boolean;
  title: string;
  exclude: Set<string>;
  onClose: () => void;
  onPick: (exerciseId: string) => void;
}) {
  const { settings, updateSettings } = useStore();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<ExerciseKind>('reps');
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allExercises().filter((e) => !needle || e.name.toLowerCase().includes(needle));
  }, [q, settings.customExercises]);
  const name = q.trim();
  const exact = list.some((e) => e.name.toLowerCase() === name.toLowerCase());

  const close = () => {
    setQ('');
    onClose();
  };

  const create = () => {
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'exercise';
    const id = `c-${slug}-${Date.now().toString(36)}`;
    updateSettings({ customExercises: { ...settings.customExercises, [id]: { id, name: name.slice(0, 60), kind } } });
    onPick(id);
    close();
  };

  return (
    <Sheet open={open} onClose={close} title={title}>
      <label className="relative block">
        <span className="sr-only">Search or name a new exercise</span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search or type a new exercise"
          className="field !pl-10"
          enterKeyHint="search"
        />
        <Icon name="plan" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
      </label>

      {name && !exact && (
        <div className="mt-3 rounded-2xl border border-line p-3">
          <div className="text-[13px] text-muted mb-2">New exercise</div>
          <div className="font-semibold mb-2.5">“{name}”</div>
          <Segmented<ExerciseKind> label="Logged as" value={kind} onChange={setKind} options={[{ value: 'reps', label: 'Weight × reps' }, { value: 'timed', label: 'Seconds' }]} />
          <button type="button" className="btn-primary mt-3 w-full" onClick={create}>
            <Icon name="plus" size={18} /> Create and add
          </button>
        </div>
      )}

      <ul className="mt-3 divide-y divide-line/70">
        {list.map((e) => {
          const used = exclude.has(e.id);
          return (
            <li key={e.id}>
              <button
                type="button"
                disabled={used}
                onClick={() => {
                  onPick(e.id);
                  close();
                }}
                className="flex w-full items-center gap-3 py-3 text-left min-h-[48px] disabled:opacity-40"
              >
                <span className="flex-1">{e.name}</span>
                <span className="text-[12px] text-faint">{used ? 'In this workout' : e.kind === 'timed' ? 'seconds' : e.id.startsWith('c-') ? 'yours' : ''}</span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && !name && <li className="py-6 text-center text-muted text-[14px]">No exercises yet.</li>}
      </ul>
    </Sheet>
  );
}
