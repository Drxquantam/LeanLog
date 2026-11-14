import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export interface TimerState {
  endsAt: number;
  total: number;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function RestTimer({ timer, onChange }: { timer: TimerState | null; onChange: (t: TimerState | null) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!timer) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timer]);

  const remaining = timer ? Math.max(0, Math.ceil((timer.endsAt - Math.max(now, Date.now())) / 1000)) : 0;

  useEffect(() => {
    if (!timer || remaining > 0) return;
    try {
      navigator.vibrate?.([180, 80, 180]);
    } catch {
      /* vibration unsupported */
    }
    const id = window.setTimeout(() => onChange(null), 2500);
    return () => window.clearTimeout(id);
  }, [timer, remaining, onChange]);

  if (!timer) return null;
  const pct = Math.min(100, ((timer.total - remaining) / timer.total) * 100);
  const over = remaining === 0;
  return (
    <div className="fixed inset-x-0 z-30 flex justify-center px-3" style={{ bottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--dock-extra, 0px) + 10px)' }}>
      <div className="sheet-enter w-full max-w-[696px] rounded-2xl bg-raised border border-line/80 shadow-[0_8px_30px_rgb(0_0_0/0.35)] overflow-hidden" role="timer" aria-live="off" aria-label={over ? 'Rest over' : `Rest ${fmt(remaining)} remaining`}>
        <div className="flex items-center gap-2 px-3 py-1.5">
          <Icon name="timer" className={over ? 'text-accent' : 'text-muted'} />
          <span className="display text-[28px] font-semibold w-[64px]">{over ? 'Go' : fmt(remaining)}</span>
          <span className="text-[13px] text-muted flex-1">{over ? 'Rest over, next set' : 'Rest'}</span>
          <button type="button" className="btn-quiet !px-3 !min-h-[44px]" onClick={() => onChange({ ...timer, endsAt: timer.endsAt - 15_000 })} aria-label="Remove 15 seconds">−15</button>
          <button type="button" className="btn-quiet !px-3 !min-h-[44px]" onClick={() => onChange({ endsAt: Math.max(Date.now(), timer.endsAt) + 15_000, total: timer.total + 15 })} aria-label="Add 15 seconds">+15</button>
          <button type="button" className="btn-quiet !px-2.5 !min-h-[44px]" onClick={() => onChange(null)} aria-label="Dismiss rest timer">
            <Icon name="close" />
          </button>
        </div>
        <div className="h-[3px] bg-line/50">
          <div className="h-full bg-accent" style={{ width: `${pct}%`, transition: 'width 250ms linear' }} />
        </div>
      </div>
    </div>
  );
}
