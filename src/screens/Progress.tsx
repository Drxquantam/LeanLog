import { useMemo, useState } from 'react';
import type { LogDay } from '../lib/types';
import { useStore } from '../lib/store';
import { allExercises, exerciseName, getExercise, isTimed } from '../lib/program';
import { bestE1RM, fmtInt, fmtKg, fmtSet, movingAverage, paceOf, topSet, volume, weeklyRate, isLogged, type Pace } from '../lib/calc';
import { isWorkoutDay, perWeek, sessionsFor } from '../lib/logs';
import { addDays, fmtDayMonth, fmtShort } from '../lib/date';
import { href } from '../lib/router';
import { BarChart, ChartEmpty, LineChart, type Pt } from '../components/charts';
import { Icon } from '../components/Icon';
import { ScreenTitle, Segmented, Stat } from '../components/ui';

type Tab = 'strength' | 'body' | 'cardio';

export default function ProgressScreen({ today }: { today: string }) {
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const t = sessionStorage.getItem('leanlog.progressTab');
      return t === 'body' || t === 'cardio' ? t : 'strength';
    } catch {
      return 'strength';
    }
  });
  const pick = (t: Tab) => {
    setTab(t);
    try { sessionStorage.setItem('leanlog.progressTab', t); } catch { /* ignore */ }
  };
  return (
    <div className="pb-tabbar">
      <ScreenTitle eyebrow="Progress" title={tab === 'strength' ? 'Strength' : tab === 'body' ? 'Body' : 'Cardio & steps'} />
      <div className="px-4 sm:px-6">
        <Segmented<Tab> label="Progress view" value={tab} onChange={pick} options={[{ value: 'strength', label: 'Strength' }, { value: 'body', label: 'Body' }, { value: 'cardio', label: 'Cardio' }]} />
        <div className="mt-6">
          {tab === 'strength' && <Strength today={today} />}
          {tab === 'body' && <Body today={today} />}
          {tab === 'cardio' && <Cardio today={today} />}
        </div>
      </div>
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-9" aria-label={title}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="display text-[22px] font-semibold uppercase tracking-wide">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

type Metric = 'top' | 'e1rm' | 'volume';

function Strength({ today }: { today: string }) {
  const { logs } = useStore();
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of logs) for (const [id, sets] of Object.entries(l.ex)) if (sets.some(isLogged)) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [logs]);
  const withData = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => getExercise(id));
  const without = allExercises().map((e) => e.id).filter((id) => !counts.has(id));
  const [exId, setExId] = useState<string>(() => (counts.has('flat-db-press') ? 'flat-db-press' : withData[0] ?? 'flat-db-press'));
  const [metric, setMetric] = useState<Metric>('e1rm');
  const timed = isTimed(exId);

  const sessions = useMemo(() => sessionsFor(logs, exId), [logs, exId]);
  const points = sessions.map((s) => {
    if (timed) return { date: s.date, y: Math.max(...s.sets.map((x) => x.r ?? 0)), sets: s.sets };
    const y = metric === 'top' ? topSet(s.sets)?.w ?? 0 : metric === 'e1rm' ? bestE1RM(s.sets) : volume(s.sets);
    return { date: s.date, y, sets: s.sets };
  }).filter((p) => p.y > 0);
  const series: Pt[] = points;
  const sessionDetails = (i: number): string[] => {
    const pt = points[i];
    if (!pt) return [];
    const prev = points[i - 1];
    const delta = prev ? pt.y - prev.y : 0;
    return [
      pt.sets.map((x) => fmtSet(x, timed)).join(', '),
      `${pt.sets.length} sets${!timed ? ` · ${fmtInt(volume(pt.sets))} kg volume` : ''}`,
      ...(prev ? [Math.abs(delta) < 0.05 ? 'Same as last time' : `${delta > 0 ? '+' : '−'}${fmt(Math.abs(delta))} ${metric === 'volume' && !timed ? 'kg' : unit} vs last time`] : ['First session']),
    ];
  };

  const unit = timed ? 's' : 'kg';
  const fmt = (n: number) => (metric === 'volume' && !timed ? fmtInt(n) : fmtKg(Math.round(n * 10) / 10));
  const best = series.length ? Math.max(...series.map((p) => p.y)) : 0;
  const firstV = series[0]?.y ?? 0;
  const lastV = series[series.length - 1]?.y ?? 0;
  const change = lastV - firstV;
  const metricName = timed ? 'Longest hold' : metric === 'top' ? 'Top set weight' : metric === 'e1rm' ? 'Estimated 1RM' : 'Session volume';

  const weeks = perWeek(logs, today, 8, isWorkoutDay);

  return (
    <>
      <Section title="Lift">
        <label className="relative block">
          <span className="sr-only">Exercise</span>
          <select value={exId} onChange={(e) => setExId(e.target.value)} className="field appearance-none pr-10 font-semibold">
            {withData.length > 0 && (
              <optgroup label="Logged">
                {withData.map((id) => <option key={id} value={id}>{exerciseName(id)} ({counts.get(id)})</option>)}
              </optgroup>
            )}
            <optgroup label={withData.length ? 'No sessions yet' : 'Exercises'}>
              {without.map((id) => <option key={id} value={id}>{exerciseName(id)}</option>)}
            </optgroup>
          </select>
          <Icon name="chevronDown" size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        </label>
        {!timed && (
          <div className="mt-2">
            <Segmented<Metric> label="Strength metric" value={metric} onChange={setMetric} options={[{ value: 'top', label: 'Top set' }, { value: 'e1rm', label: 'Est. 1RM' }, { value: 'volume', label: 'Volume' }]} />
          </div>
        )}

        {series.length === 0 ? (
          <div className="mt-4">
            <ChartEmpty title={`No ${exerciseName(exId)} sessions yet`} body={`Once you log sets on a day that includes ${exerciseName(exId)}, ${metricName.toLowerCase()} will chart here session by session.`}>
              <a href={href({ name: 'today' })} className="btn-outline mt-4 !min-h-[40px]">Log today</a>
            </ChartEmpty>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Stat label="Best" value={fmt(best)} unit={metric === 'volume' && !timed ? 'kg' : unit} />
              <Stat label="Since first" value={`${change > 0 ? '+' : change < 0 ? '−' : ''}${fmt(Math.abs(change))}`} unit={metric === 'volume' && !timed ? 'kg' : unit} />
              <Stat label="Sessions" value={series.length} />
            </div>
            <div className="mt-4 -mx-1">
              <LineChart data={series} details={sessionDetails} tipFormat={(n) => `${fmt(n)} ${metric === 'volume' && !timed ? 'kg' : unit}${!timed && metric === 'e1rm' ? ' est. 1RM' : !timed && metric === 'top' ? ' top set' : timed ? ' best hold' : ' volume'}`} label={`${exerciseName(exId)}, ${metricName} per session. Latest ${fmt(lastV)} ${unit}, best ${fmt(best)} ${unit}.`} format={fmt} />
            </div>
            {!timed && metric === 'e1rm' && <p className="mt-1 text-[12px] text-faint">Estimated 1RM uses Epley: kg × (1 + reps ÷ 30), best set per session.</p>}
          </>
        )}
      </Section>

      <Section title="Workouts per week" aside={<span className="text-[12.5px] text-muted">Target 6</span>}>
        {weeks.every((w) => w.count === 0) ? (
          <ChartEmpty title="No workouts logged yet" body="Each day with logged sets counts toward its Monday-to-Sunday week. Eight weeks show here." />
        ) : (
          <BarChart
            data={weeks.map((w, i) => ({ key: w.week, label: i === weeks.length - 1 ? 'Now' : fmtDayMonth(w.week), value: w.count, title: `Week of ${fmtShort(w.week)}` }))}
            details={(i) => { const c = weeks[i]?.count ?? 0; return [c >= 6 ? 'Target hit' : `${6 - c} short of 6`]; }}
            label={`Workouts per week over 8 weeks against a target of 6. This week ${weeks[weeks.length - 1]?.count ?? 0}.`}
            format={(n) => String(Math.round(n))}
            target={6}
            targetLabel="6 / wk"
          />
        )}
      </Section>
    </>
  );
}

const PACE: Record<Pace, { label: string; note: string }> = {
  gaining: { label: 'Gaining', note: 'Trend is up. Check calories against your target.' },
  slow: { label: 'Slow', note: 'Under 0.3 kg a week. Fine for a long cut, or trim 100 to 150 kcal.' },
  'on-pace': { label: 'On pace', note: '0.3 to 1 kg a week. A good rate for keeping muscle.' },
  fast: { label: 'Fast', note: 'Over 1 kg a week. Watch your lifts; if they drop, eat a little more.' },
};

function Body({ today }: { today: string }) {
  const { logs } = useStore();
  const points = useMemo(() => logs.filter((l): l is LogDay & { weight: number } => l.weight !== null).map((l) => ({ date: l.date, weight: l.weight })), [logs]);
  const [range, setRange] = useState<'30' | '90' | 'all'>('90');
  const ma = useMemo(() => movingAverage(points), [points]);
  const rate = useMemo(() => weeklyRate(points), [points]);
  const from = range === 'all' ? '0000' : addDays(today, -Number(range));
  const shownMa = ma.filter((p) => p.date >= from).map((p) => ({ date: p.date, y: Math.round(p.avg * 10) / 10 }));
  const shownDots = points.filter((p) => p.date >= from).map((p) => ({ date: p.date, y: p.weight }));
  const current = ma[ma.length - 1]?.avg;
  const pace = rate !== null ? paceOf(rate) : null;

  if (points.length === 0) {
    return (
      <Section title="Weight trend">
        <ChartEmpty title="No weigh-ins yet" body="Add your morning weight under Daily numbers on the Today screen. Daily points and a 7-day average line will appear here.">
          <a href={href({ name: 'today' })} className="btn-outline mt-4 !min-h-[40px]">Add today’s weight</a>
        </ChartEmpty>
      </Section>
    );
  }

  const start = points[0]?.weight ?? 0;
  const change = current !== undefined ? current - start : 0;
  const lowest = Math.min(...points.map((p) => p.weight));

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="7-day avg" value={current !== undefined ? fmtKg(Math.round(current * 10) / 10) : '–'} unit="kg" />
        <Stat label="Since start" value={`${change > 0 ? '+' : change < 0 ? '−' : ''}${fmtKg(Math.abs(Math.round(change * 10) / 10))}`} unit="kg" sub={`from ${fmtKg(start)}`} />
        <Stat label="Lowest" value={fmtKg(lowest)} unit="kg" sub="single weigh-in" />
      </div>

      <div className="mb-6 rounded-2xl border border-line px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Weekly rate</div>
            <div className="mt-0.5 display text-[28px] font-semibold leading-none">
              {rate === null ? '–' : `${rate > 0 ? '+' : rate < 0 ? '−' : ''}${fmtKg(Math.abs(Math.round(rate * 100) / 100))}`}
              <span className="ml-1 font-sans text-[12.5px] font-normal text-muted">kg / week</span>
            </div>
          </div>
          {pace && (
            <span className={`chip !h-8 !px-3 font-semibold ${pace === 'on-pace' ? '!border-accent/60 !text-accent' : pace === 'fast' ? '!border-fg/50 !text-fg' : ''}`}>
              {pace === 'fast' && <Icon name="alert" size={15} />}
              {PACE[pace].label}
            </span>
          )}
        </div>
        <p className="mt-2 text-[13px] text-muted">
          {rate === null ? 'Needs 3 or more weigh-ins across at least 5 days. Weigh in most mornings for a steady trend.' : PACE[pace ?? 'slow'].note}
        </p>
      </div>

      <Section title="Weight trend" aside={
        <div className="w-[170px]"><Segmented label="Weight range" value={range} onChange={setRange} options={[{ value: '30', label: '30d' }, { value: '90', label: '90d' }, { value: 'all', label: 'All' }]} /></div>
      }>
        {shownMa.length === 0 ? (
          <ChartEmpty title="No weigh-ins in this range" body="Pick a longer range or add today’s weight." />
        ) : (
          <div className="-mx-1">
            <LineChart
              data={shownMa}
              dots={shownDots}
              tipFormat={(n) => `${fmtKg(n)} kg`}
              details={(i) => {
                const pt = shownMa[i];
                const raw = shownDots.find((d) => d.date === pt?.date);
                return ['7-day average', ...(raw ? [`Weigh-in that day ${fmtKg(raw.y)} kg`] : [])];
              }}
              label={`Body weight 7-day average. Latest ${shownMa[shownMa.length - 1]?.y ?? ''} kg.`}
              format={(n) => fmtKg(Math.round(n * 10) / 10)}
            />
          </div>
        )}
        <div className="mt-2 flex gap-4 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted/60" /> Daily weigh-in</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-4 rounded bg-accent" /> 7-day average</span>
        </div>
      </Section>
    </>
  );
}

function Cardio({ today }: { today: string }) {
  const { byDate, logs, settings } = useStore();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const dayLabel = (d: string) => (d === today ? 'Today' : String(Number(d.slice(8))));
  const steps = days.map((d) => ({ key: d, label: dayLabel(d), value: byDate.get(d)?.steps ?? 0, title: fmtShort(d) }));
  const cals = days.map((d) => ({ key: d, label: dayLabel(d), value: byDate.get(d)?.cal ?? 0, title: fmtShort(d) }));
  const hiit = perWeek(logs, today, 8, (l) => l.hiit.done);
  const stepsLogged = steps.filter((s) => s.value > 0);
  const avgSteps = stepsLogged.length ? stepsLogged.reduce((a, b) => a + b.value, 0) / stepsLogged.length : 0;
  const calLogged = cals.filter((s) => s.value > 0);
  const avgCal = calLogged.length ? calLogged.reduce((a, b) => a + b.value, 0) / calLogged.length : 0;
  const k = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)));

  return (
    <>
      <Section title="Steps" aside={<span className="text-[12.5px] text-muted">{stepsLogged.length ? `avg ${fmtInt(avgSteps)} · ${steps.filter((s) => s.value >= settings.steps).length}/14 hit` : 'last 14 days'}</span>}>
        {stepsLogged.length === 0 ? (
          <ChartEmpty title="No steps logged in 14 days" body="Enter steps under Daily numbers. Bars turn solid on days you reach the goal line." />
        ) : (
          <BarChart data={steps} details={(i) => { const v = steps[i]?.value ?? 0; return v === 0 ? ['Not logged'] : [`${Math.round((v / settings.steps) * 100)}% of goal`]; }} tipFormat={(n) => `${fmtInt(n)} steps`} tone="steps" hitTone target={settings.steps} targetLabel={`Goal ${k(settings.steps)}`} format={k} label={`Daily steps for the last 14 days against a goal of ${fmtInt(settings.steps)}. Average ${fmtInt(avgSteps)}.`} />
        )}
      </Section>

      <Section title="Calories" aside={<span className="text-[12.5px] text-muted">{calLogged.length ? `avg ${fmtInt(avgCal)} kcal` : 'last 14 days'}</span>}>
        {calLogged.length === 0 ? (
          <ChartEmpty title="No calories logged in 14 days" body={`Enter calories under Daily numbers. The dashed line marks your ${fmtInt(settings.cal)} kcal target.`} />
        ) : (
          <BarChart data={cals} details={(i) => { const v = cals[i]?.value ?? 0; const d = v - settings.cal; return v === 0 ? ['Not logged'] : [d > 0 ? `${fmtInt(d)} over target` : d < 0 ? `${fmtInt(-d)} under target` : 'Exactly on target']; }} tipFormat={(n) => `${fmtInt(n)} kcal`} tone="cal" target={settings.cal} targetLabel={`Target ${fmtInt(settings.cal)}`} format={k} label={`Daily calories for the last 14 days against a target of ${fmtInt(settings.cal)}. Average ${fmtInt(avgCal)}.`} />
        )}
      </Section>

      <Section title="HIIT per week" aside={<span className="text-[12.5px] text-muted">Target 2</span>}>
        {hiit.every((w) => w.count === 0) ? (
          <ChartEmpty title="No HIIT sessions yet" body="Toggle HIIT done in the cardio card on Monday and Friday. Each week's sessions stack up here." />
        ) : (
          <BarChart
            data={hiit.map((w, i) => ({ key: w.week, label: i === hiit.length - 1 ? 'Now' : fmtDayMonth(w.week), value: w.count, title: `Week of ${fmtShort(w.week)}` }))}
            details={(i) => { const c = hiit[i]?.count ?? 0; return [`HIIT session${c === 1 ? '' : 's'}`, c >= 2 ? 'Target hit' : `${2 - c} short of 2`]; }}
            tone="hiit"
            hitTone
            target={2}
            targetLabel="2 / wk"
            format={(n) => String(Math.round(n))}
            label={`HIIT sessions per week over 8 weeks against a target of 2. This week ${hiit[hiit.length - 1]?.count ?? 0}.`}
          />
        )}
      </Section>
    </>
  );
}
