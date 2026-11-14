/** Hand-rolled SVG charts that share the app's color tokens. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { diffDays, fmtDayMonth, fmtShort } from '../lib/date';

const fmtLong = (d: string) => `${fmtShort(d)} ${d.slice(0, 4)}`;

type Tone = 'accent' | 'hiit' | 'steps' | 'cal';
const col = (t: Tone, a = 1) => `rgb(var(--${t}) / ${a})`;

function useWidth<T extends HTMLElement>(): [React.MutableRefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(340);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setW(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1;
  const raw = span / (count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

export interface Pt {
  date: string;
  y: number;
}

const PAD = { l: 38, r: 16, t: 26, b: 24 };

function DataTable({ caption, rows }: { caption: string; rows: [string, string][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr><th scope="col">Date</th><th scope="col">Value</th></tr></thead>
      <tbody>{rows.map(([a, b], i) => <tr key={i}><td>{a}</td><td>{b}</td></tr>)}</tbody>
    </table>
  );
}


/**
 * Hover (mouse), tap (touch) and arrow-key focus for a chart's points.
 * Mouse clears on leave; a touch tooltip stays until you tap outside the chart.
 */
function usePointFocus(count: number) {
  const [active, setActive] = useState<number | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (active === null) return;
    const off = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setActive(null);
    };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [active]);
  useEffect(() => {
    if (active !== null && active >= count) setActive(null);
  }, [active, count]);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (count === 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      setActive((a) => (a === null ? (dir > 0 ? 0 : count - 1) : Math.min(count - 1, Math.max(0, a + dir))));
    } else if (e.key === 'Escape') setActive(null);
  };
  return { active, setActive, box, onKeyDown };
}

function Tooltip({ x, y, width, title, lines, below }: { x: number; y: number; width: number; title: string; lines: string[]; below: boolean }) {
  const w = 172;
  const left = Math.min(Math.max(x, w / 2 + 2), width - w / 2 - 2);
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-xl border border-line/80 bg-raised px-3 py-2 shadow-[0_8px_24px_rgb(0_0_0/0.35)] fade-enter"
      style={{ left, top: below ? y + 14 : y - 14, width: w, transform: `translate(-50%, ${below ? '0%' : '-100%'})` }}
    >
      <div className="text-[11.5px] font-medium text-muted">{title}</div>
      {lines.map((l, i) => (
        <div key={i} className={i === 0 ? 'display text-[19px] font-semibold leading-tight' : 'text-[12.5px] text-fg/90 leading-snug'}>{l}</div>
      ))}
    </div>
  );
}

/**
 * Time-scaled line with area fill. `dots` draws raw observations (e.g. daily weigh-ins)
 * behind the main line; the last main point is emphasised with its value.
 */
export function LineChart({
  data, dots, label, format, tone = 'accent', height = 210, target, targetLabel, details, tipFormat,
}: {
  data: Pt[];
  tipFormat?: (n: number) => string;
  /** Extra tooltip lines for point i (e.g. the session's sets). */
  details?: (i: number) => string[];
  dots?: Pt[];
  label: string;
  format: (n: number) => string;
  tone?: Tone;
  height?: number;
  target?: number;
  targetLabel?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { active, setActive, box, onKeyDown } = usePointFocus(data.length);
  if (data.length === 0) return null;
  const all = [...data, ...(dots ?? [])];
  const first = all.reduce((a, b) => (a.date < b.date ? a : b)).date;
  const last = all.reduce((a, b) => (a.date > b.date ? a : b)).date;
  const span = Math.max(1, diffDays(first, last));
  const ys = all.map((p) => p.y).concat(target !== undefined ? [target] : []);
  let min = Math.min(...ys);
  let max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const ticks = niceTicks(min, max);
  const y0 = ticks[0] ?? min;
  const y1 = ticks[ticks.length - 1] ?? max;
  const iw = width - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;
  const sx = (d: string) => PAD.l + (data.length === 1 && !dots ? iw / 2 : (diffDays(first, d) / span) * iw);
  const sy = (v: number) => PAD.t + ih - ((v - y0) / (y1 - y0 || 1)) * ih;
  const line = data.map((p, i) => `${i ? 'L' : 'M'}${sx(p.date).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const lastPt = data[data.length - 1];
  const firstPt = data[0];
  const area = lastPt && firstPt ? `${line}L${sx(lastPt.date).toFixed(1)},${PAD.t + ih}L${sx(firstPt.date).toFixed(1)},${PAD.t + ih}Z` : '';
  const xLabels = span >= 6 ? [first, data.length > 2 ? addMid(first, span) : null, last] : [first, last];
  const lx = lastPt ? sx(lastPt.date) : 0;
  const ly = lastPt ? sy(lastPt.y) : 0;
  const valueText = lastPt ? format(lastPt.y) : '';
  const anchorEnd = lx > width - 60;
  const nearest = (clientX: number, el: Element) => {
    const px = clientX - el.getBoundingClientRect().left;
    let best = 0;
    let bestD = Infinity;
    data.forEach((p, i) => {
      const d = Math.abs(sx(p.date) - px);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  };
  const ap = active !== null ? data[active] : undefined;
  const tipLines = ap && active !== null ? [(tipFormat ?? format)(ap.y), ...(details?.(active) ?? [])] : [];

  return (
    <div ref={(el) => { ref.current = el; box.current = el; }} className="relative w-full rounded-lg" tabIndex={0} role="group" aria-label={`${label} Use arrow keys to inspect points.`} onKeyDown={onKeyDown}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        className="block overflow-visible touch-pan-y"
        onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons > 0) && setActive(nearest(e.clientX, e.currentTarget))}
        onPointerDown={(e) => setActive(nearest(e.clientX, e.currentTarget))}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={width - PAD.r} y1={sy(t)} y2={sy(t)} stroke="rgb(var(--line))" strokeOpacity={0.55} strokeWidth={1} />
            <text x={PAD.l - 8} y={sy(t)} dy="0.35em" textAnchor="end" fontSize={11} fill="rgb(var(--faint))">{format(t)}</text>
          </g>
        ))}
        {target !== undefined && (
          <g>
            <line x1={PAD.l} x2={width - PAD.r} y1={sy(target)} y2={sy(target)} stroke="rgb(var(--muted))" strokeDasharray="4 4" strokeWidth={1} />
            {targetLabel && <text x={width - PAD.r} y={sy(target) - 6} textAnchor="end" fontSize={11} fill="rgb(var(--muted))" stroke="rgb(var(--bg))" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">{targetLabel}</text>}
          </g>
        )}
        {xLabels.map((d, i) => d && (
          <text key={i} x={sx(d)} y={height - 6} fontSize={11} fill="rgb(var(--faint))" textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}>{fmtDayMonth(d)}</text>
        ))}
        {data.length > 1 && <path d={area} fill={col(tone, 0.12)} />}
        {dots?.map((p, i) => <circle key={i} cx={sx(p.date)} cy={sy(p.y)} r={2.6} fill="rgb(var(--muted))" fillOpacity={0.55} />)}
        {data.length > 1 && <path d={line} fill="none" stroke={col(tone)} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />}
        {!dots && data.length <= 24 && data.slice(0, -1).map((p, i) => <circle key={i} cx={sx(p.date)} cy={sy(p.y)} r={2.5} fill={col(tone)} />)}
        {lastPt && (
          <g>
            <circle cx={lx} cy={ly} r={9} fill={col(tone, 0.2)} />
            <circle cx={lx} cy={ly} r={4.5} fill={col(tone)} stroke="rgb(var(--surface))" strokeWidth={2} />
            {active === null && <text x={anchorEnd ? lx - 12 : lx + 12} y={ly - 12} textAnchor={anchorEnd ? 'end' : 'start'} fontSize={15} fontWeight={600} className="font-display" fill="rgb(var(--fg))" stroke="rgb(var(--bg))" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">{valueText}</text>}
          </g>
        )}
        {ap && (
          <g pointerEvents="none">
            <line x1={sx(ap.date)} x2={sx(ap.date)} y1={PAD.t} y2={PAD.t + ih} stroke="rgb(var(--muted))" strokeDasharray="3 3" />
            <circle cx={sx(ap.date)} cy={sy(ap.y)} r={7} fill={col(tone)} stroke="rgb(var(--surface))" strokeWidth={2.5} />
          </g>
        )}
      </svg>
      {ap && <Tooltip x={sx(ap.date)} y={sy(ap.y)} width={width} title={fmtLong(ap.date)} lines={tipLines} below={sy(ap.y) < PAD.t + 80} />}
      <div className="sr-only" aria-live="polite">{ap ? `${fmtLong(ap.date)}: ${tipLines.join(', ')}` : ''}</div>
      <DataTable caption={label} rows={data.map((p) => [fmtDayMonth(p.date), format(p.y)])} />
    </div>
  );
}

function addMid(first: string, span: number): string {
  const d = new Date(`${first}T12:00:00`);
  d.setDate(d.getDate() + Math.round(span / 2));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface Bar {
  key: string;
  label: string;
  value: number;
  title: string;
}

/** Vertical bars with an optional dashed target line; the last bar carries its value. */
export function BarChart({
  data, label, format, tone = 'accent', height = 180, target, targetLabel, hitTone, details, tipFormat,
}: {
  data: Bar[];
  details?: (i: number) => string[];
  /** Exact value format for the tooltip (axis labels may be abbreviated). */
  tipFormat?: (n: number) => string;
  label: string;
  format: (n: number) => string;
  tone?: Tone;
  height?: number;
  target?: number;
  targetLabel?: string;
  /** colour bars at/over target in full tone and others muted */
  hitTone?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const max = Math.max(...data.map((d) => d.value), target ?? 0, 1);
  const ticks = niceTicks(0, max * 1.05, 4);
  const top = ticks[ticks.length - 1] ?? max;
  const iw = width - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;
  const slot = iw / Math.max(1, data.length);
  const bw = Math.min(28, slot * 0.62);
  const sy = (v: number) => PAD.t + ih - (v / top) * ih;
  const lastIdx = data.length - 1;
  const every = data.length > 10 ? Math.ceil(data.length / 7) : 1;
  const { active, setActive, box, onKeyDown } = usePointFocus(data.length);
  const slotAt = (clientX: number, el: Element) => Math.min(data.length - 1, Math.max(0, Math.floor((clientX - el.getBoundingClientRect().left - PAD.l) / slot)));
  const ab = active !== null ? data[active] : undefined;
  const abH = ab ? Math.max(ab.value > 0 ? 3 : 0, (ab.value / top) * ih) : 0;
  const tipLines = ab && active !== null ? [(tipFormat ?? format)(ab.value), ...(details?.(active) ?? [])] : [];

  return (
    <div ref={(el) => { ref.current = el; box.current = el; }} className="relative w-full rounded-lg" tabIndex={0} role="group" aria-label={`${label} Use arrow keys to inspect bars.`} onKeyDown={onKeyDown}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        className="block overflow-visible touch-pan-y"
        onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons > 0) && setActive(slotAt(e.clientX, e.currentTarget))}
        onPointerDown={(e) => setActive(slotAt(e.clientX, e.currentTarget))}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={width - PAD.r} y1={sy(t)} y2={sy(t)} stroke="rgb(var(--line))" strokeOpacity={0.55} />
            <text x={PAD.l - 8} y={sy(t)} dy="0.35em" textAnchor="end" fontSize={11} fill="rgb(var(--faint))">{format(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = PAD.l + slot * i + (slot - bw) / 2;
          const h = Math.max(d.value > 0 ? 3 : 0, (d.value / top) * ih);
          const hit = target !== undefined && d.value >= target;
          const base = hitTone ? (hit ? 1 : 0.4) : i === lastIdx ? 1 : 0.55;
          const alpha = active === null ? base : i === active ? 1 : base * 0.6;
          return (
            <g key={d.key}>
              <title>{d.title}</title>
              {d.value === 0 && <rect x={x} y={PAD.t + ih - 2} width={bw} height={2} rx={1} fill="rgb(var(--line))" />}
              <rect x={x} y={PAD.t + ih - h} width={bw} height={h} rx={Math.min(5, bw / 3)} fill={col(tone, alpha)} />
              {((i % every === 0 && lastIdx - i >= Math.max(2, every)) || i === lastIdx) && (
                <text x={x + bw / 2} y={height - 6} textAnchor="middle" fontSize={11} fill={i === lastIdx ? 'rgb(var(--fg))' : 'rgb(var(--faint))'}>{d.label}</text>
              )}
              {i === lastIdx && d.value > 0 && active === null && (
                <text x={x + bw / 2} y={PAD.t + ih - h - 7} textAnchor="middle" fontSize={14} fontWeight={600} className="font-display" fill="rgb(var(--fg))" stroke="rgb(var(--bg))" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">{format(d.value)}</text>
              )}
            </g>
          );
        })}
        {target !== undefined && (
          <g>
            <line x1={PAD.l} x2={width - PAD.r} y1={sy(target)} y2={sy(target)} stroke="rgb(var(--fg))" strokeOpacity={0.55} strokeDasharray="4 4" />
            {targetLabel && <text x={PAD.l + 4} y={sy(target) - 6} fontSize={11} fill="rgb(var(--muted))" stroke="rgb(var(--bg))" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">{targetLabel}</text>}
          </g>
        )}
      </svg>
      {ab && active !== null && (
        <Tooltip x={PAD.l + slot * active + slot / 2} y={PAD.t + ih - abH} width={width} title={ab.title} lines={tipLines} below={PAD.t + ih - abH < PAD.t + 70} />
      )}
      <div className="sr-only" aria-live="polite">{ab ? `${ab.title}: ${tipLines.join(', ')}` : ''}</div>
      <DataTable caption={label} rows={data.map((d) => [d.title, format(d.value)])} />
    </div>
  );
}

export function ChartEmpty({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="relative h-[190px] overflow-hidden rounded-xl">
      <svg className="absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="none" viewBox="0 0 100 100">
        {[20, 45, 70].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgb(var(--line))" strokeOpacity="0.55" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />)}
        <path d="M0,72 C20,68 30,55 50,52 S80,35 100,30" fill="none" stroke="rgb(var(--line))" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-[14.5px] font-semibold">{title}</p>
        <p className="mt-1 max-w-[34ch] text-[13px] text-muted">{body}</p>
        {children}
      </div>
    </div>
  );
}
