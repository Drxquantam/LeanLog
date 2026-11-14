import { memo, useMemo, useState } from 'react';
import type { Baseline, LogDay, Prescription, SetEntry } from '../lib/types';
import { getExercise, isTimed } from '../lib/program';
import { fmtKg, fmtSet, isLogged, isPR } from '../lib/calc';
import { sessionsFor } from '../lib/logs';
import { fmtShort } from '../lib/date';
import { NumField } from '../components/ui';
import { Icon } from '../components/Icon';

interface Props {
  date: string;
  p: Prescription;
  sets: SetEntry[] | undefined;
  logs: LogDay[];
  baseline: Baseline | undefined;
  onChange: (exerciseId: string, sets: SetEntry[]) => void;
  onSetLogged: () => void;
  /** Shows an edit button that opens the exercise editor for this workout. */
  onEdit?: (exerciseId: string) => void;
}

function ExerciseBlockInner({ date, p, sets: stored, logs, baseline, onChange, onSetLogged, onEdit }: Props) {
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const ex = getExercise(p.exerciseId);
  const timed = isTimed(p.exerciseId);
  const bw = ex?.bodyweight === true;
  const name = ex?.name ?? p.exerciseId;
  const earlier = useMemo(() => sessionsFor(logs, p.exerciseId, date), [logs, p.exerciseId, date]);
  const last = earlier[earlier.length - 1] ?? null;
  const rows: SetEntry[] = stored ?? Array.from({ length: p.sets }, () => ({ w: null, r: null }));
  const loggedCount = rows.filter(isLogged).length;
  const pr = useMemo(() => isPR(rows, earlier.map((s) => s.sets)), [rows, earlier]);

  const placeholder = (i: number): SetEntry | null => {
    if (last) return last.sets[i] ?? last.sets[last.sets.length - 1] ?? null;
    if (baseline) return { w: baseline.w, r: baseline.r };
    return null;
  };

  const write = (next: SetEntry[]) => onChange(p.exerciseId, next);

  const setAt = (i: number, patch: Partial<SetEntry>) => {
    const next = rows.map((s) => ({ ...s }));
    const cur = next[i];
    if (!cur) return;
    const wasLogged = isLogged(cur);
    Object.assign(cur, patch);
    // Entering reps on a row with no weight adopts the hinted weight, like a paper log.
    if (patch.r !== undefined && cur.w === null && !bw) {
      const ph = placeholder(i);
      if (ph?.w != null && ph.w > 0) cur.w = ph.w;
    }
    write(next);
    if (!wasLogged && isLogged(cur)) onSetLogged();
  };

  const hint = last
    ? `Last: ${last.sets.map((s) => fmtSet(s, timed)).join(', ')} on ${fmtShort(last.date)}`
    : baseline
      ? `Start: ${fmtKg(baseline.w)} kg × ${baseline.r}`
      : 'First session. Your numbers become next time’s hints.';

  const unit = timed ? 'sec' : 'reps';
  const headId = `ex-${p.exerciseId}`;

  return (
    <section aria-labelledby={headId} className="py-5 hairline first:border-t-0">
      <div className="flex items-start justify-between gap-3 px-4 sm:px-6">
        <div className="min-w-0">
          <h3 id={headId} className="text-[16.5px] font-semibold leading-snug">{name}</h3>
          <p className="mt-0.5 text-[13px] text-muted leading-snug">{hint}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          {pr && (
            <span className="chip !border-accent/60 !text-accent !h-6 !px-2 text-[11.5px] font-semibold" aria-label="Personal record: best estimated one-rep max">
              <Icon name="trophy" size={14} /> PR
            </span>
          )}
          <span className="chip !h-6 !px-2 text-[12px]" aria-label={`Target ${p.sets} sets of ${p.target}`}>
            {p.sets} × {p.target}
          </span>
          {onEdit && (
            <button type="button" onClick={() => onEdit(p.exerciseId)} className="-mr-2 grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-raised hover:text-fg" aria-label={`Edit ${name}`}>
              <Icon name="edit" size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 px-4 sm:px-6" role="group" aria-label={`${name} sets`}>
        <div className="grid grid-cols-[34px_1fr_1fr] gap-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint" aria-hidden>
          <span className="text-center">Set</span>
          <span className="pl-1">kg</span>
          <span className="pl-1">{unit}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {rows.map((s, i) => {
            const ph = placeholder(i);
            const done = isLogged(s);
            const base = s.w ?? (ph?.w != null && ph.w > 0 ? ph.w : bw ? 0 : 20);
            const picks = [-5, -2.5, 0, 2.5, 5].map((d) => base + d).filter((w) => w >= 0 && (w > 0 || bw));
            return (
              <div key={i}>
              <div className="grid grid-cols-[34px_1fr_1fr] items-center gap-2">
                <span
                  className={`grid h-8 w-8 place-items-center justify-self-center rounded-full text-[13px] font-semibold transition-colors ${done ? 'bg-accent text-on-accent' : 'text-faint border border-line'}`}
                  aria-label={done ? `Set ${i + 1} logged` : `Set ${i + 1}`}
                >
                  {done ? <Icon name="check" size={16} /> : i + 1}
                </span>
                <NumField
                  decimal
                  max={999}
                  value={s.w}
                  onChange={(w) => setAt(i, { w })}
                  onFocus={() => setActiveRow(i)}
                  onBlur={() => setActiveRow((r) => (r === i ? null : r))}
                  label={`${name} set ${i + 1} weight in kg`}
                  placeholder={ph?.w != null && ph.w > 0 ? fmtKg(ph.w) : bw ? 'BW' : '–'}
                  suffix="kg"
                  className={`field !h-12 !pr-9 text-[18px] font-medium ${done ? '!bg-raised/50' : ''}`}
                />
                <NumField
                  max={timed ? 900 : 100}
                  value={s.r}
                  onChange={(r) => setAt(i, { r })}
                  label={`${name} set ${i + 1} ${unit}`}
                  placeholder={ph?.r != null ? String(ph.r) : '–'}
                  className={`field !h-12 text-[18px] font-medium ${done ? '!bg-raised/50' : ''}`}
                />
              </div>
              {activeRow === i && (
                <div className="fade-enter mt-1.5 ml-[42px] flex flex-wrap gap-1.5" role="group" aria-label={`Quick weight for set ${i + 1}`}>
                  {picks.map((w) => {
                    const on = s.w === w;
                    return (
                      <button
                        key={w}
                        type="button"
                        // keep focus in the kg field so the picker stays open and typing still works
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => setAt(i, { w: bw && w === 0 ? null : w })}
                        aria-pressed={on}
                        className={`h-11 min-w-[56px] rounded-xl px-3 text-[15px] font-medium transition-colors ${on ? 'bg-accent text-on-accent' : 'bg-raised text-fg hover:bg-line/60'}`}
                      >
                        {bw && w === 0 ? 'BW' : fmtKg(w)}
                      </button>
                    );
                  })}
                  {i < rows.length - 1 && s.w !== null && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => write(rows.map((x, j) => (j > i && !isLogged(x) ? { ...x, w: s.w } : x)))}
                      className="h-11 rounded-xl px-3 text-[13.5px] font-medium text-accent hover:bg-raised"
                    >
                      Same for next sets
                    </button>
                  )}
                </div>
              )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-1 -ml-2">
          <button type="button" className="btn-quiet !px-3" onClick={() => write([...rows, { w: null, r: null }])} aria-label={`Add a set to ${name}`}>
            <Icon name="plus" size={18} /> Set
          </button>
          <button type="button" className="btn-quiet !px-3 disabled:opacity-35" disabled={rows.length <= 1} onClick={() => write(rows.slice(0, -1))} aria-label={`Remove last set from ${name}`}>
            <Icon name="minus" size={18} /> Set
          </button>
          <button
            type="button"
            className="btn-quiet !px-3 disabled:opacity-35"
            disabled={!last}
            onClick={() => {
              if (!last) return;
              const copied = last.sets.map((x) => ({ ...x }));
              write(copied);
              if (loggedCount === 0) onSetLogged();
            }}
            aria-label={`Copy last session into ${name}`}
          >
            <Icon name="copy" size={18} /> Copy last
          </button>
          <span className="ml-auto text-[12.5px] text-faint pr-0.5">{loggedCount}/{rows.length}</span>
        </div>
      </div>
    </section>
  );
}

export const ExerciseBlock = memo(ExerciseBlockInner);
