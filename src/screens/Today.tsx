import { useCallback, useMemo, useState } from 'react';
import type { HiitLog, LogDay, Machine, SetEntry, WalkLog } from '../lib/types';
import { useStore } from '../lib/store';
import { ROTATION, TEMPLATES, cardioLabel, carriedFrom, prescriptions, plannedSetCount, scheduledTemplate } from '../lib/program';
import { WorkoutEditing, type EditTarget, type PickTarget } from './WorkoutEditing';
import { dayVolume, fmtInt, isPR, loggedSetCount } from '../lib/calc';
import { nextWorkout, sessionsFor } from '../lib/logs';
import { diffDays, dowLong, fmtShort, fromKey, monthShort, weekdayMon } from '../lib/date';
import { href, navigate } from '../lib/router';
import { ExerciseBlock } from './ExerciseBlock';
import { Icon } from '../components/Icon';
import { NumField, ProgressBar, Segmented, Toggle } from '../components/ui';
import { RestTimer, type TimerState } from '../components/RestTimer';

export function DayEditor({ date, today }: { date: string; today: string }) {
  const { getLog, updateLog, logs, byDate, settings } = useStore();
  const stored = byDate.get(date) ?? getLog(date);
  // The rotation decides each day's workout.
  const tplId = scheduledTemplate(date);
  const log = stored.templateId === tplId ? stored : { ...stored, templateId: tplId };
  const isToday = date === today;
  const tpl = TEMPLATES[tplId];
  const { main, abs } = prescriptions(tplId);
  const planned = plannedSetCount(tplId);
  const trained = log.done || loggedSetCount(log) > 0;
  const carried = tplId !== 'REST' ? carriedFrom(date) : null;
  const nextInRotation = ROTATION[(ROTATION.indexOf(tplId) + 1) % ROTATION.length] ?? 'CS-A';
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [pick, setPick] = useState<PickTarget | null>(null);
  const editMain = useCallback((exerciseId: string) => tplId !== 'REST' && setEdit({ block: tplId, exerciseId }), [tplId]);
  const editAbs = useCallback((exerciseId: string) => setEdit({ block: 'ABS', exerciseId }), []);
  const logged = loggedSetCount(log);
  // Exercises logged on this day that the (edited) plan no longer lists.
  const extras = useMemo(() => {
    const planned = new Set([...main, ...abs].map((p) => p.exerciseId));
    return Object.entries(log.ex)
      .filter(([id, sets]) => !planned.has(id) && sets.some((s) => s.w !== null || s.r !== null))
      .map(([id, sets]) => ({ exerciseId: id, sets: sets.length, target: '–' }));
  }, [main, abs, log.ex]);
  const totalRows = useMemo(
    () => [...main, ...abs, ...extras].reduce((n, p) => n + (log.ex[p.exerciseId]?.length ?? p.sets), 0),
    [main, abs, extras, log.ex],
  );
  const [timer, setTimer] = useState<TimerState | null>(null);

  const update = useCallback((fn: (l: LogDay) => LogDay) => updateLog(date, fn), [updateLog, date]);
  const onSets = useCallback((id: string, sets: SetEntry[]) => update((l) => ({ ...l, ex: { ...l.ex, [id]: sets } })), [update]);
  const onSetLogged = useCallback(() => {
    if (settings.restTimer) setTimer({ endsAt: Date.now() + settings.restSeconds * 1000, total: settings.restSeconds });
  }, [settings.restTimer, settings.restSeconds]);

  const d = fromKey(date);
  const rel = diffDays(today, date);
  const eyebrow = isToday ? `Today · ${dowLong(date)}` : rel === -1 ? `Yesterday · ${dowLong(date)}` : rel === 1 ? `Tomorrow · ${dowLong(date)}` : dowLong(date);

  return (
    <div className="pb-tabbar">
      <header className="safe-top px-4 sm:px-6">
        <div className="flex items-center justify-between pt-4 h-[52px]">
          {isToday ? (
            <span className="eyebrow">{eyebrow}</span>
          ) : (
            <a href={href({ name: 'calendar' })} className="btn-quiet -ml-3 !px-2" aria-label="Back to calendar">
              <Icon name="chevronLeft" /> <span className="text-[14px]">Calendar</span>
            </a>
          )}
          {!isToday && (
            <button type="button" className="btn-quiet !px-3 -mr-3 text-accent" onClick={() => navigate({ name: 'today' })}>
              Go to today
            </button>
          )}
        </div>
        {!isToday && <div className="eyebrow">{eyebrow}{date < today ? ' · editing past day' : ''}</div>}
        <h1 className="display mt-0.5 text-[52px] font-bold leading-[0.9] tracking-tight uppercase">
          {d.getDate()} {monthShort(date)}
        </h1>

        <div className="mt-4 flex items-center gap-3">
          <span className={`display grid h-11 min-w-[52px] place-items-center rounded-xl px-2 text-[20px] font-bold ${tplId === 'REST' ? 'text-faint ring-1 ring-inset ring-line' : 'bg-accent/10 text-accent'}`}>{tpl.code}</span>
          <div className="min-w-0">
            <div className="text-[17px] font-semibold leading-tight">{tplId === 'REST' ? (weekdayMon(date) === 1 ? 'Gym closed · rest day' : 'Rest day') : tpl.name}</div>
            {tplId !== 'REST' && <div className="text-[12.5px] text-muted">{tpl.short} in your rotation</div>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {tpl.cardio === 'hiit' && <span className="chip !border-hiit/50 !text-hiit"><Icon name="bolt" size={14} /> HIIT 15 min</span>}
          {(tpl.cardio === 'incline' || tpl.cardio === 'easy-walk') && <span className="chip"><Icon name="walk" size={14} /> {cardioLabel(log.templateId)}</span>}
          {tpl.abs && <span className="chip">+ Abs</span>}
        </div>

        {tplId !== 'REST' && !trained && date <= today && (
          <div className="mt-4 rounded-2xl border border-line px-4 py-3">
            {log.skipped ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 text-[13.5px]">
                  <div className="font-semibold">Skipped</div>
                  <div className="text-muted">The rotation moved on to {TEMPLATES[nextInRotation].name}.</div>
                </div>
                <button type="button" className="btn-outline !min-h-[40px] !px-3 text-[13.5px]" onClick={() => update((l) => ({ ...l, skipped: false }))}>Undo</button>
              </div>
            ) : (
              <>
                {carried && (
                  <p className="mb-2 text-[13.5px]">
                    <span className="font-semibold">You missed {tpl.short} on {fmtShort(carried)}.</span>{' '}
                    <span className="text-muted">It’s waiting for you, so that body part still gets trained.</span>
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <p className="flex-1 text-[12.5px] text-muted">Not doing {tpl.short}? Skip it and the rotation moves on to {TEMPLATES[nextInRotation].short}. Not training at all? Do nothing and it waits for you.</p>
                  <button type="button" className="btn-outline !min-h-[40px] !px-3 text-[13.5px] shrink-0" onClick={() => update((l) => ({ ...l, skipped: true }))}>Skip</button>
                </div>
              </>
            )}
          </div>
        )}

        {tplId !== 'REST' && !(log.skipped && !trained) && (
          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[13px] text-muted">
                <span className="display text-[20px] font-semibold text-fg">{logged}</span> of {totalRows} sets
              </span>
              {log.done && <span className="text-[12.5px] font-medium text-accent">Finished</span>}
            </div>
            <ProgressBar value={logged} max={totalRows || planned} label="Sets logged" />
          </div>
        )}
      </header>

      {tplId === 'REST' ? (
        <RestBlock date={date} />
      ) : log.skipped && !trained ? null : (
        <div className="mt-3">
          {main.map((p) => (
            <ExerciseBlock key={p.exerciseId} date={date} p={p} sets={log.ex[p.exerciseId]} logs={logs} baseline={settings.baselines[p.exerciseId]} onChange={onSets} onSetLogged={onSetLogged} onEdit={editMain} />
          ))}
          <div className="px-4 sm:px-6 pb-2">
            <button type="button" className="btn-outline w-full border-dashed" onClick={() => setPick({ block: tplId })}>
              <Icon name="plus" size={18} /> Add exercise
            </button>
          </div>
          {abs.length > 0 && (
            <>
              <div className="px-4 sm:px-6 pt-6 pb-1 hairline">
                <h2 className="display text-[24px] font-semibold uppercase tracking-wide">Abs</h2>
              </div>
              {abs.map((p) => (
                <ExerciseBlock key={p.exerciseId} date={date} p={p} sets={log.ex[p.exerciseId]} logs={logs} baseline={settings.baselines[p.exerciseId]} onChange={onSets} onSetLogged={onSetLogged} onEdit={editAbs} />
              ))}
              <div className="px-4 sm:px-6 pb-2">
                <button type="button" className="btn-quiet w-full" onClick={() => setPick({ block: 'ABS' })}>
                  <Icon name="plus" size={18} /> Add abs exercise
                </button>
              </div>
            </>
          )}
          {extras.length > 0 && (
            <>
              <div className="px-4 sm:px-6 pt-6 pb-1 hairline">
                <h2 className="display text-[24px] font-semibold uppercase tracking-wide">Also logged</h2>
                <p className="text-[12.5px] text-muted">No longer in this workout’s plan. Kept so nothing you logged is lost.</p>
              </div>
              {extras.map((p) => (
                <ExerciseBlock key={p.exerciseId} date={date} p={p} sets={log.ex[p.exerciseId]} logs={logs} baseline={settings.baselines[p.exerciseId]} onChange={onSets} onSetLogged={onSetLogged} />
              ))}
            </>
          )}
          <FinishBar log={log} logs={logs} onToggle={(done) => update((l) => ({ ...l, done }))} />
        </div>
      )}

      <div className="mt-8 space-y-6 px-4 sm:px-6">
        <CardioCard log={log} update={update} />
        <DailyNumbers log={log} update={update} />
        {isToday && <UpNext date={date} byDate={byDate} />}
      </div>

      <RestTimer timer={timer} onChange={setTimer} />
      <WorkoutEditing date={date} templateId={tplId} edit={edit} pick={pick} onEdit={setEdit} onPick={setPick} />
    </div>
  );
}

function RestBlock({ date }: { date: string }) {
  const tue = weekdayMon(date) === 1;
  return (
    <div className="mx-4 sm:mx-6 mt-6 rounded-2xl border border-line px-5 py-6">
      <Icon name="moon" size={22} className="text-muted" />
      <p className="mt-3 display text-[26px] font-semibold leading-tight">{tue ? 'Gym closed. Rest day.' : 'Rest day'}</p>
      <p className="mt-1 text-[14px] text-muted">Easy walk, hit your steps, keep protein high. Recovery is where the muscle stays.</p>
    </div>
  );
}

function FinishBar({ log, logs, onToggle }: { log: LogDay; logs: LogDay[]; onToggle: (done: boolean) => void }) {
  const sets = loggedSetCount(log);
  const vol = dayVolume(log);
  const prs = Object.entries(log.ex).filter(([id, s]) => isPR(s, sessionsFor(logs, id, log.date).map((x) => x.sets))).length;
  return (
    <div className="px-4 sm:px-6 pt-5 hairline">
      {log.done ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-accent/10 px-4 py-3.5">
          <div>
            <div className="flex items-center gap-2 font-semibold text-accent"><Icon name="check" size={18} /> Workout finished</div>
            <div className="mt-0.5 text-[13px] text-muted">
              {sets} sets · {fmtInt(vol)} kg volume{prs > 0 ? ` · ${prs} PR${prs > 1 ? 's' : ''}` : ''}
            </div>
          </div>
          <button type="button" className="btn-quiet !px-3" onClick={() => onToggle(false)}>Reopen</button>
        </div>
      ) : (
        <button type="button" className="btn-primary w-full !min-h-[52px] text-[16px] font-semibold disabled:opacity-40" disabled={sets === 0} onClick={() => onToggle(true)}>
          <Icon name="check" size={18} /> Finish workout
        </button>
      )}
      {!log.done && sets === 0 && <p className="mt-2 text-center text-[12.5px] text-faint">Log at least one set to finish.</p>}
    </div>
  );
}

const MACHINES: { value: Machine; label: string }[] = [
  { value: 'bike', label: 'Bike' },
  { value: 'rower', label: 'Rower' },
  { value: 'treadmill', label: 'Treadmill' },
];

function CardioCard({ log, update }: { log: LogDay; update: (fn: (l: LogDay) => LogDay) => void }) {
  const plan = TEMPLATES[log.templateId].cardio;
  const [openHiit, setOpenHiit] = useState(false);
  const [openWalk, setOpenWalk] = useState(false);
  const hiitOpen = plan === 'hiit' || openHiit || log.hiit.done;
  const walkOpen = plan === 'incline' || plan === 'easy-walk' || openWalk || log.walk.done;
  const setH = (patch: Partial<HiitLog>) => update((l) => ({ ...l, hiit: { ...l.hiit, ...patch } }));
  const setW = (patch: Partial<WalkLog>) => update((l) => ({ ...l, walk: { ...l.walk, ...patch } }));

  return (
    <section aria-labelledby="cardio-h" className="card overflow-hidden">
      <h2 id="cardio-h" className="sr-only">Cardio</h2>
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-hiit/15 text-hiit"><Icon name="bolt" size={18} /></span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">HIIT {plan === 'hiit' && <span className="ml-1 text-[12px] font-medium text-hiit">Planned</span>}</div>
            <div className="text-[12.5px] text-muted">15 min · 8-10 × 30 s hard / 60-90 s easy</div>
          </div>
          <Toggle tone="hiit" checked={log.hiit.done} onChange={(done) => setH(done ? { done, min: log.hiit.min ?? 15 } : { done })} label="HIIT done" />
        </div>
        {hiitOpen ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <LabeledNum label="Minutes" value={log.hiit.min} onChange={(min) => setH({ min })} placeholder="15" max={120} />
            <LabeledNum label="Rounds" value={log.hiit.rounds} onChange={(rounds) => setH({ rounds })} placeholder="8-10" max={40} />
            <LabeledNum label="Effort 1-10" value={log.hiit.rpe} onChange={(rpe) => setH({ rpe: rpe === null ? null : Math.max(1, rpe) })} placeholder="8" max={10} />
            <div className="col-span-3">
              <Segmented label="HIIT machine" value={log.hiit.machine ?? ('' as Machine)} options={MACHINES} onChange={(machine) => setH({ machine: log.hiit.machine === machine ? null : machine })} />
            </div>
          </div>
        ) : (
          <button type="button" className="mt-1 -ml-2 btn-quiet !min-h-[40px] !px-2 text-[13px]" onClick={() => setOpenHiit(true)}>Log HIIT anyway</button>
        )}
      </div>
      <div className="hairline px-4 pt-3.5 pb-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-raised text-muted"><Icon name="walk" size={18} /></span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">
              {plan === 'easy-walk' ? 'Easy walk' : 'Incline walk'}
              {(plan === 'incline' || plan === 'easy-walk') && <span className="ml-1 text-[12px] font-medium text-accent">Planned</span>}
            </div>
            <div className="text-[12.5px] text-muted">Minutes and incline</div>
          </div>
          <Toggle checked={log.walk.done} onChange={(done) => setW({ done })} label="Walk done" />
        </div>
        {walkOpen ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <LabeledNum label="Minutes" value={log.walk.min} onChange={(min) => setW({ min })} placeholder={plan === 'easy-walk' ? '30' : '20'} max={300} />
            <LabeledNum label="Incline %" value={log.walk.incline} onChange={(incline) => setW({ incline })} placeholder={plan === 'easy-walk' ? '0' : '10'} max={30} decimal />
          </div>
        ) : (
          <button type="button" className="mt-1 -ml-2 btn-quiet !min-h-[40px] !px-2 text-[13px]" onClick={() => setOpenWalk(true)}>Log a walk</button>
        )}
      </div>
    </section>
  );
}

function LabeledNum({ label, value, onChange, placeholder, max, decimal = false }: { label: string; value: number | null; onChange: (n: number | null) => void; placeholder?: string; max?: number; decimal?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-medium text-muted">{label}</span>
      <NumField value={value} onChange={onChange} label={label} placeholder={placeholder} max={max} decimal={decimal} />
    </label>
  );
}

function DailyNumbers({ log, update }: { log: LogDay; update: (fn: (l: LogDay) => LogDay) => void }) {
  const { settings } = useStore();
  const rows = [
    { key: 'steps' as const, label: 'Steps', icon: 'steps' as const, tone: 'steps' as const, target: settings.steps, unit: '' },
    { key: 'cal' as const, label: 'Calories', icon: 'flame' as const, tone: 'cal' as const, target: settings.cal, unit: 'kcal' },
    { key: 'protein' as const, label: 'Protein', icon: 'check' as const, tone: 'accent' as const, target: settings.protein, unit: 'g' },
  ];
  const toneText = { steps: 'text-steps', cal: 'text-cal', accent: 'text-accent' };
  return (
    <section aria-labelledby="daily-h">
      <h2 id="daily-h" className="display text-[24px] font-semibold uppercase tracking-wide mb-2">Daily numbers</h2>
      <div className="card divide-y divide-line/70">
        {rows.map((r) => {
          const v = log[r.key];
          const pct = v !== null ? Math.round((v / r.target) * 100) : 0;
          return (
            <div key={r.key} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-medium">{r.label}</div>
                  <div className="text-[12.5px] text-muted">
                    {v === null ? `Target ${fmtInt(r.target)}${r.unit ? ` ${r.unit}` : ''}` : (
                      <>
                        <span className={pct >= 100 && r.key !== 'cal' ? toneText[r.tone] : ''}>{pct}%</span> of {fmtInt(r.target)}
                        {r.key === 'cal' && v > r.target ? ` · ${fmtInt(v - r.target)} over` : ''}
                      </>
                    )}
                  </div>
                </div>
                <div className="w-[128px]">
                  <NumField value={v} onChange={(n) => update((l) => ({ ...l, [r.key]: n }))} label={`${r.label}${r.unit ? ` in ${r.unit}` : ''}`} placeholder="–" suffix={r.unit} className="field text-right !pr-12 font-medium" max={r.key === 'steps' ? 200000 : 20000} />
                </div>
              </div>
              <div className="mt-2.5">
                <ProgressBar value={v ?? 0} max={r.target} tone={r.tone} label={`${r.label} progress`} height={4} />
              </div>
            </div>
          );
        })}
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[14.5px] font-medium">Body weight</div>
            <div className="text-[12.5px] text-muted">Morning, after the bathroom</div>
          </div>
          <div className="w-[128px]">
            <NumField decimal value={log.weight} onChange={(weight) => update((l) => ({ ...l, weight }))} label="Body weight in kg" placeholder="–" suffix="kg" className="field text-right !pr-10 font-medium" max={300} />
          </div>
        </div>
        <label className="block px-4 py-3">
          <span className="text-[14.5px] font-medium">Notes</span>
          <textarea
            value={log.notes}
            onChange={(e) => update((l) => ({ ...l, notes: e.target.value }))}
            rows={2}
            placeholder="Energy, sleep, form cues…"
            className="mt-2 w-full resize-y rounded-xl bg-raised border border-transparent px-3 py-2.5 text-[15px] focus:border-accent focus:outline-none"
          />
        </label>
      </div>
    </section>
  );
}

function UpNext({ date, byDate }: { date: string; byDate: Map<string, LogDay> }) {
  const next = nextWorkout(date, byDate);
  const todayTpl = byDate.get(date)?.templateId ?? scheduledTemplate(date);
  const closed = weekdayMon(date) === 1 && todayTpl === 'REST';
  if (!next) return null;
  const t = TEMPLATES[next.templateId];
  const days = diffDays(date, next.date);
  return (
    <section aria-labelledby="next-h" className="rounded-2xl border border-line px-4 py-4">
      <h2 id="next-h" className="eyebrow">Up next</h2>
      {closed && <p className="mt-2 text-[15px] font-semibold">Gym closed, rest day</p>}
      <a href={href({ name: 'day', date: next.date })} className="mt-2 flex items-center gap-3 rounded-xl -mx-1 px-1 py-1 hover:bg-raised/40">
        <span className="display grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-raised text-[20px] font-bold">{t.code}</span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold truncate">{t.name}</span>
          <span className="block text-[13px] text-muted">
            {days === 1 ? 'Tomorrow' : fmtShort(next.date)} · {plannedSetCount(next.templateId)} sets{cardioLabel(next.templateId) ? ` · ${cardioLabel(next.templateId)}` : ''}
          </span>
        </span>
        <Icon name="chevronRight" className="text-faint" />
      </a>
    </section>
  );
}
