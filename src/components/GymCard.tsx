import { useMemo, useRef, type CSSProperties, type PointerEvent } from 'react';
import './gymcard.css';
import type { TierId } from '../lib/streak';
import { TIERS, tierFor } from '../lib/streak';
import { fromKey } from '../lib/date';

export interface CardStats {
  current: number;
  best: number;
  total: number;
  since: string | null;
  week: number;
}

/** Dumbbell emblem in place of a payment chip: plates, collars and a knurled handle, tilted for motion. */
function Emblem() {
  return (
    <svg viewBox="0 0 64 64" className="gc-emblem" aria-hidden>
      <defs>
        <linearGradient id="gc-holo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff2bd6" />
          <stop offset=".35" stopColor="#00e5ff" />
          <stop offset=".7" stopColor="#39ff88" />
          <stop offset="1" stopColor="#ffe600" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" className="gc-emblem-ring" />
      <g transform="rotate(-28 32 32)">
        <rect x="21" y="29.5" width="22" height="5" rx="1.5" className="gc-emblem-bar" />
        <path d="M25 29.5v5M28 29.5v5M31 29.5v5M34 29.5v5M37 29.5v5M40 29.5v5" className="gc-emblem-knurl" />
        <rect x="15" y="17" width="6" height="30" rx="2" className="gc-emblem-plate" />
        <rect x="9.5" y="21" width="5.5" height="22" rx="2" className="gc-emblem-plate" />
        <rect x="6" y="28.5" width="3.5" height="7" rx="1.2" className="gc-emblem-bar" />
        <rect x="43" y="17" width="6" height="30" rx="2" className="gc-emblem-plate" />
        <rect x="49" y="21" width="5.5" height="22" rx="2" className="gc-emblem-plate" />
        <rect x="54.5" y="28.5" width="3.5" height="7" rx="1.2" className="gc-emblem-bar" />
        <path d="M17 20v9M45 20v9M11.5 24v6M51 24v6" className="gc-emblem-shine" />
      </g>
    </svg>
  );
}

function Mark({ tier }: { tier: TierId }) {
  // Tier sigil: more strokes as the tier rises.
  const n = TIERS.findIndex((t) => t.id === tier) + 1;
  return (
    <svg viewBox="0 0 24 24" className="gc-mark" aria-hidden>
      <path d="M12 2.5l8 4.6v9.8l-8 4.6-8-4.6V7.1z" fill="none" />
      {Array.from({ length: Math.min(n, 5) }, (_, i) => (
        <path key={i} d={`M8 ${15.5 - i * 2.2}l4-2.2 4 2.2`} fill="none" />
      ))}
      {tier === 'apex' && <circle cx="12" cy="6.3" r="1.2" className="gc-mark-dot" />}
    </svg>
  );
}

/** A membership-style card that floats, tilts toward the pointer and catches light. */
export function GymCard({ tier, stats, name, locked = false, interactive = true, className = '' }: {
  tier: TierId;
  stats: CardStats;
  name: string;
  locked?: boolean;
  interactive?: boolean;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const t = TIERS.find((x) => x.id === tier) ?? tierFor(0);
  const sparks = useMemo(
    () => Array.from({ length: tier === 'apex' ? 26 : tier === 'diamond' ? 12 : 0 }, (_, i) => ({
      left: `${(i * 37 + 11) % 100}%`,
      delay: `${((i * 0.73) % 4).toFixed(2)}s`,
      dur: `${(3 + ((i * 1.31) % 3)).toFixed(2)}s`,
      size: `${2 + (i % 3)}px`,
    })),
    [tier],
  );

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el || !interactive) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(x - 0.5) * 26}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 20}deg`);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.dataset.active = '1';
  };
  const leave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--mx', '50%');
    el.style.setProperty('--my', '30%');
    delete el.dataset.active;
  };

  const since = stats.since ? fromKey(stats.since) : null;
  const sinceText = since ? `${String(since.getMonth() + 1).padStart(2, '0')}/${String(since.getFullYear()).slice(2)}` : '--/--';
  const label = locked
    ? `${t.name} card, locked. Unlocks at ${t.min} workouts in a row.`
    : `${t.name} gym card for ${name}. ${stats.current} workouts in a row, best ${stats.best}, ${stats.total} total.`;

  return (
    <div className={`gc-stage ${className}`} onPointerMove={move} onPointerLeave={leave} onPointerUp={leave} onPointerCancel={leave} role="img" aria-label={label}>
      <div className="gc-float">
        <div ref={cardRef} className={`gc-card gc-${tier} ${locked ? 'gc-locked' : ''}`} style={{ '--mx': '50%', '--my': '30%' } as CSSProperties}>
          {tier === 'apex' && <div className="gc-aura" aria-hidden />}
          <div className="gc-material" aria-hidden />
          {(tier === 'diamond' || tier === 'apex') && <div className="gc-foil" aria-hidden />}
          <div className="gc-grain" aria-hidden />
          {sparks.length > 0 && (
            <div className="gc-sparks" aria-hidden>
              {sparks.map((s, i) => <span key={i} style={{ left: s.left, animationDelay: s.delay, animationDuration: s.dur, width: s.size, height: s.size }} />)}
            </div>
          )}
          <div className="gc-shine" aria-hidden />

          <div className="gc-content" aria-hidden>
            <div className="gc-top">
              <span className="gc-brand">LEAN&nbsp;LOG</span>
              <span className="gc-tier"><Mark tier={tier} />{locked ? '???' : t.name}</span>
            </div>
            <div className="gc-mid">
              <Emblem />
              <div className="gc-streak">
                <span className="gc-num" data-text={locked ? '—' : String(stats.current)}>{locked ? '—' : stats.current}</span>
                <span className="gc-numlabel">workouts<br />in a row</span>
              </div>
            </div>
            <div className="gc-bottom">
              <div className="gc-name">{locked ? 'Locked' : name}</div>
              <div className="gc-stats">
                <span><b>{locked ? '--' : stats.best}</b>best</span>
                <span><b>{locked ? '--' : stats.total}</b>total</span>
                <span><b>{locked ? '-' : `${stats.week}/6`}</b>week</span>
                <span><b>{locked ? '--/--' : sinceText}</b>since</span>
              </div>
            </div>
          </div>
          {locked && (
            <div className="gc-lock" aria-hidden>
              <svg viewBox="0 0 24 24"><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" fill="none" /></svg>
              <span>{t.min} in a row</span>
            </div>
          )}
        </div>
      </div>
      <div className="gc-shadow" aria-hidden />
    </div>
  );
}
