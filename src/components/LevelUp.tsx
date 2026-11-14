import { useEffect, useMemo, useRef } from 'react';
import { GymCard, type CardStats } from './GymCard';
import type { Tier } from '../lib/streak';

const PALETTE: Record<string, string[]> = {
  bronze: ['#f0bd94', '#c98450', '#7f431d'],
  silver: ['#ffffff', '#c9ced6', '#8a919b'],
  gold: ['#fff2bd', '#f0cd6a', '#d4a23a'],
  platinum: ['#f6fbff', '#c6d6e5', '#8fb3d9'],
  diamond: ['#a5e6ff', '#6fd3ff', '#c4a8ff', '#ffffff'],
  apex: ['#ff2bd6', '#7a5cff', '#00e5ff', '#39ff88', '#ffe600', '#ff6a00'],
};

/** Full-screen unlock moment: the new card spins in under falling confetti. */
export function LevelUp({ tier, stats, name, onClose }: { tier: Tier; stats: CardStats; name: string; onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  const apex = tier.id === 'apex';
  const colors = PALETTE[tier.id] ?? PALETTE.gold ?? [];
  const confetti = useMemo(
    () => Array.from({ length: apex ? 90 : 45 }, (_, i) => ({
      left: `${(i * 53 + 7) % 100}%`,
      delay: `${((i * 0.37) % 3).toFixed(2)}s`,
      dur: `${(2.6 + ((i * 0.61) % 2.4)).toFixed(2)}s`,
      bg: colors[i % colors.length],
      w: `${6 + (i % 3) * 2}px`,
    })),
    [apex, colors],
  );

  useEffect(() => {
    btn.current?.focus();
    try {
      navigator.vibrate?.(apex ? [60, 40, 60, 40, 220] : [80, 50, 120]);
    } catch {
      /* unsupported */
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [apex, onClose]);

  return (
    <div className={`lu-backdrop ${apex ? 'lu-apex' : ''}`} role="dialog" aria-modal="true" aria-labelledby="lu-title" style={{ ['--lu-ray' as string]: apex ? 'rgba(255,43,214,.22)' : 'rgba(255,255,255,.08)' }}>
      <div className="lu-rays" aria-hidden />
      {apex && <div className="lu-flash" aria-hidden />}
      <div className="lu-confetti" aria-hidden>
        {confetti.map((c, i) => (
          <span key={i} style={{ left: c.left, background: c.bg, width: c.w, animationDelay: c.delay, animationDuration: c.dur }} />
        ))}
      </div>
      <div className="relative flex flex-col items-center gap-3">
        <div className="lu-eyebrow">{apex ? 'Final card unlocked' : 'Level up'}</div>
        <h2 id="lu-title" className="lu-title">{apex ? 'APEX' : tier.name}</h2>
        <div className="lu-card">
          <GymCard tier={tier.id} stats={stats} name={name} />
        </div>
        <p className="lu-sub">
          {apex ? `${tier.min} workouts without a single miss. You did what almost nobody does.` : `${tier.blurb} Keep the streak alive for the next card.`}
        </p>
        <button ref={btn} type="button" onClick={onClose} className="lu-btn btn-primary mt-2 !min-h-[52px] px-8 text-[16px] font-semibold">
          {apex ? 'Claim it' : 'Let’s go'}
        </button>
      </div>
    </div>
  );
}
