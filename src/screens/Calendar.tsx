import { useMemo, useState } from 'react';
import type { LogDay } from '../lib/types';
import { useStore } from '../lib/store';
import { TEMPLATES, allPrescriptions, exerciseName, isTimed, scheduledTemplate } from '../lib/program';
import { dayVolume, fmtInt, fmtKg, fmtSet, isLogged, loggedSetCount } from '../lib/calc';
import { dayStatus, type DayStatus } from '../lib/logs';
import { DOW_LETTERS, DOW_NAMES, addDays, fmtMonthYear, fmtShort, fromKey, startOfWeek, toKey } from '../lib/date';
import { href } from '../lib/router';
import { Icon } from '../components/Icon';
import { ScreenTitle, Sheet } from '../components/ui';

const STATUS_LABEL: Record<DayStatus, string> = { done: 'Done', partial: 'Partial', planned: 'Planned', missed: 'Missed', skipped: 'Skipped', rest: 'Rest' };

export default function CalendarScreen({ today }: { today: string }) {
  const { byDate, settings } = useStore();
  const t = fromKey(today);
  const [ym, setYm] = useState({ y: t.getFullYear(), m: t.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);

  const days = useMemo(() => {
    const first = toKey(new Date(ym.y, ym.m, 1, 12));
    const start = startOfWeek(first);
    const lastOfMonth = toKey(new Date(ym.y, ym.m + 1, 0, 12));
    const end = addDays(startOfWeek(lastOfMonth), 6);
    const out: string[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [ym]);

  const shift = (n: number) => setYm(({ y, m }) => {
    const d = new Date(y, m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const monthStats = useMemo(() => {
    let workouts = 0, hiit = 0, stepsHit = 0;
    for (const [date, l] of byDate) {
      const d = fromKey(date);
      if (d.getFullYear() !== ym.y || d.getMonth() !== ym.m) continue;
      if (l.templateId !== 'REST' && (l.done || loggedSetCount(l) > 0)) workouts++;
      if (l.hiit.done) hiit++;
      if ((l.steps ?? 0) >= settings.steps) stepsHit++;
    }
    return { workouts, hiit, stepsHit };
  }, [byDate, ym, settings.steps]);

  const isCurrent = ym.y === t.getFullYear() && ym.m === t.getMonth();

  return (
    <div className="pb-tabbar">
      <ScreenTitle
        eyebrow="Calendar"
        title={fmtMonthYear(ym.y, ym.m)}
        right={
          <div className="flex items-center -mr-2">
            <button type="button" className="btn-quiet !px-2.5" onClick={() => shift(-1)} aria-label="Previous month"><Icon name="chevronLeft" /></button>
            <button type="button" className="btn-quiet !px-2.5" onClick={() => shift(1)} aria-label="Next month"><Icon name="chevronRight" /></button>
          </div>
        }
      />
      <div className="px-4 sm:px-6">
        <div className="flex items-center gap-5 text-[13px] text-muted mb-4">
          <span><span className="display text-[20px] font-semibold text-fg">{monthStats.workouts}</span> workouts</span>
          <span><span className="display text-[20px] font-semibold text-fg">{monthStats.hiit}</span> HIIT</span>
          <span><span className="display text-[20px] font-semibold text-fg">{monthStats.stepsHit}</span> step goals</span>
          {!isCurrent && (
            <button type="button" className="ml-auto text-accent font-medium min-h-[44px]" onClick={() => setYm({ y: t.getFullYear(), m: t.getMonth() })}>Today</button>
          )}
        </div>

        <div role="grid" aria-label={`Training calendar, ${fmtMonthYear(ym.y, ym.m)}`}>
          <div role="row" className="grid grid-cols-7 gap-1 mb-1">
            {DOW_LETTERS.map((l, i) => (
              <div role="columnheader" key={i} aria-label={DOW_NAMES[i]} className="text-center text-[11px] font-semibold text-faint py-1">{l}</div>
            ))}
          </div>
          {Array.from({ length: days.length / 7 }, (_, w) => (
            <div role="row" key={w} className="grid grid-cols-7 gap-1 mb-1">
              {days.slice(w * 7, w * 7 + 7).map((date) => (
                <DayCell key={date} date={date} log={byDate.get(date)} today={today} inMonth={fromKey(date).getMonth() === ym.m} stepsGoal={settings.steps} onOpen={() => setSelected(date)} />
              ))}
            </div>
          ))}
        </div>

        <Legend />
      </div>

      <Sheet open={selected !== null} onClose={() => setSelected(null)} title={selected ? fmtShort(selected) : ''}>
        {selected && <DayDetail date={selected} log={byDate.get(selected)} today={today} />}
      </Sheet>
    </div>
  );
}

function tagClass(s: DayStatus): string {
  switch (s) {
    case 'done': return 'bg-accent text-on-accent';
    case 'partial': return 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/50';
    case 'planned': return 'text-muted ring-1 ring-inset ring-line';
    case 'missed': return 'text-faint line-through decoration-1';
    case 'skipped': return 'text-faint border border-dashed border-line';
    case 'rest': return 'text-faint';
  }
}

function DayCell({ date, log, today, inMonth, stepsGoal, onOpen }: { date: string; log: LogDay | undefined; today: string; inMonth: boolean; stepsGoal: number; onOpen: () => void }) {
  const tpl = TEMPLATES[log?.templateId ?? scheduledTemplate(date)];
  const status = dayStatus(date, log, today);
  const isToday = date === today;
  const hiit = log?.hiit.done === true;
  const steps = (log?.steps ?? 0) >= stepsGoal;
  const label = `${fmtShort(date)}, ${tpl.id === 'REST' ? 'rest day' : `${tpl.short} ${STATUS_LABEL[status].toLowerCase()}`}${hiit ? ', HIIT done' : ''}${steps ? ', steps goal hit' : ''}`;
  return (
    <div role="gridcell" className={inMonth ? '' : 'opacity-35'}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        className={`flex h-[64px] w-full flex-col items-center justify-between rounded-xl py-1.5 transition-colors hover:bg-raised/60 ${isToday ? 'bg-raised' : ''}`}
      >
        <span className={`text-[12.5px] leading-none ${isToday ? 'font-bold text-accent' : 'text-muted'}`}>{fromKey(date).getDate()}</span>
        <span className={`display inline-flex h-[20px] min-w-[32px] items-center justify-center rounded-md px-1 text-[13px] font-semibold tracking-wide ${tagClass(status)}`}>
          {tpl.code}
        </span>
        <span className="flex h-1.5 items-center gap-1" aria-hidden>
          {hiit && <span className="h-1.5 w-1.5 rounded-full bg-hiit" />}
          {steps && <span className="h-1.5 w-1.5 rounded-full bg-steps" />}
        </span>
      </button>
    </div>
  );
}

function Legend() {
  const items: { s: DayStatus; label: string }[] = [
    { s: 'done', label: 'Done' }, { s: 'partial', label: 'Partial' }, { s: 'planned', label: 'Planned' }, { s: 'missed', label: 'Missed' }, { s: 'skipped', label: 'Skipped' },
  ];
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-muted" aria-label="Legend">
      {items.map((i) => (
        <span key={i.s} className="inline-flex items-center gap-1.5">
          <span className={`display inline-flex h-[16px] min-w-[24px] items-center justify-center rounded px-1 text-[11px] font-semibold ${tagClass(i.s)}`}>CS</span>
          {i.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-hiit" /> HIIT</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-steps" /> Steps goal</span>
    </div>
  );
}

function DayDetail({ date, log, today }: { date: string; log: LogDay | undefined; today: string }) {
  const tplId = log?.templateId ?? scheduledTemplate(date);
  const tpl = TEMPLATES[tplId];
  const status = dayStatus(date, log, today);
  const future = date > today;
  const logged = log ? Object.entries(log.ex).filter(([, s]) => s.some(isLogged)) : [];

  return (
    <div>
      <div className="flex items-center gap-2 text-[14px]">
        <span className={`display inline-flex h-[22px] min-w-[34px] items-center justify-center rounded-md px-1.5 text-[14px] font-semibold ${tagClass(status)}`}>{tpl.code}</span>
        <span className="font-semibold">{tpl.name}</span>
        <span className="text-muted">· {STATUS_LABEL[status]}</span>
      </div>

      {log && (
        <dl className="mt-4 grid grid-cols-3 gap-3">
          <Metric label="Volume" value={loggedSetCount(log) ? fmtInt(dayVolume(log)) : '–'} unit="kg" />
          <Metric label="Steps" value={log.steps !== null ? fmtInt(log.steps) : '–'} />
          <Metric label="Calories" value={log.cal !== null ? fmtInt(log.cal) : '–'} />
          <Metric label="Protein" value={log.protein !== null ? fmtInt(log.protein) : '–'} unit="g" />
          <Metric label="Weight" value={log.weight !== null ? fmtKg(log.weight) : '–'} unit="kg" />
          <Metric label="Sets" value={String(loggedSetCount(log))} />
        </dl>
      )}

      {(log?.hiit.done || log?.walk.done) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {log.hiit.done && (
            <span className="chip !border-hiit/50 !text-hiit"><Icon name="bolt" size={14} /> HIIT {log.hiit.min ?? 15} min{log.hiit.rounds ? ` · ${log.hiit.rounds} rounds` : ''}{log.hiit.rpe ? ` · RPE ${log.hiit.rpe}` : ''}</span>
          )}
          {log.walk.done && <span className="chip"><Icon name="walk" size={14} /> Walk {log.walk.min ?? '?'} min{log.walk.incline ? ` · ${log.walk.incline}%` : ''}</span>}
        </div>
      )}

      {logged.length > 0 ? (
        <ul className="mt-5 divide-y divide-line/70">
          {logged.map(([id, sets]) => (
            <li key={id} className="py-2.5">
              <div className="text-[14.5px] font-medium">{exerciseName(id)}</div>
              <div className="text-[13px] text-muted">{sets.filter(isLogged).map((s) => fmtSet(s, isTimed(id))).join(', ')}</div>
            </li>
          ))}
        </ul>
      ) : tplId !== 'REST' ? (
        <div className="mt-5">
          <div className="eyebrow mb-2">{future || date === today ? 'Planned' : 'Nothing logged'}</div>
          <ul className="text-[14px] text-muted space-y-1">
            {allPrescriptions(tplId).map((p) => (
              <li key={p.exerciseId} className="flex justify-between gap-3"><span>{exerciseName(p.exerciseId)}</span><span className="text-faint">{p.sets} × {p.target}</span></li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-5 text-[14px] text-muted">Rest day. Easy walk and steps.</p>
      )}

      {log?.notes && <p className="mt-4 rounded-xl bg-raised px-3 py-2.5 text-[14px] whitespace-pre-wrap">{log.notes}</p>}

      <a href={href(date === today ? { name: 'today' } : { name: 'day', date })} className="btn-primary mt-6 w-full">
        {future ? 'Open day to plan or swap' : 'Open day'} <Icon name="arrowRight" size={18} />
      </a>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl bg-raised px-3 py-2.5">
      <dt className="text-[11px] font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 display text-[22px] font-semibold leading-none">{value}{unit && value !== '–' && <span className="ml-0.5 font-sans text-[11px] font-normal text-muted">{unit}</span>}</dd>
    </div>
  );
}
