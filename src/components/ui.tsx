import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

/** Numeric text input that keeps a draft string so "22." can be typed, and commits parsed numbers. */
export function NumField({
  value, onChange, label, placeholder, decimal = false, max, className = 'field', id, onBlur, onFocus, suffix,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  label: string;
  placeholder?: string;
  decimal?: boolean;
  max?: number;
  className?: string;
  id?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  suffix?: string;
}) {
  const [draft, setDraft] = useState(value === null ? '' : String(value));
  const focused = useRef(false);
  useEffect(() => {
    // Sync from outside unless the user's in-progress text already means this value (e.g. "22.").
    setDraft((d) => {
      const parsed = d === '' || d === '.' ? null : Number(d);
      return focused.current && parsed === value ? d : value === null ? '' : String(value);
    });
  }, [value]);
  const input = (
    <input
      id={id}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="next"
      autoComplete="off"
      aria-label={label}
      placeholder={placeholder}
      className={className}
      value={draft}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
        onFocus?.();
      }}
      onBlur={() => {
        focused.current = false;
        setDraft(value === null ? '' : String(value));
        onBlur?.();
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(',', '.');
        const ok = decimal ? /^\d{0,4}(\.\d{0,2})?$/ : /^\d{0,6}$/;
        if (!ok.test(raw)) return;
        setDraft(raw);
        if (raw === '' || raw === '.') return onChange(null);
        let n = Number(raw);
        if (max !== undefined) n = Math.min(n, max);
        if (Number.isFinite(n)) onChange(n);
      }}
    />
  );
  if (!suffix) return input;
  return (
    <div className="relative">
      {input}
      <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-faint">{suffix}</span>
    </div>
  );
}

export function ProgressBar({ value, max, tone = 'accent', label, height = 6 }: { value: number; max: number; tone?: 'accent' | 'steps' | 'cal' | 'hiit'; label: string; height?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const bg = { accent: 'bg-accent', steps: 'bg-steps', cal: 'bg-cal', hiit: 'bg-hiit' }[tone];
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} className="w-full rounded-full bg-raised overflow-hidden" style={{ height }}>
      <div className={`bar-fill h-full rounded-full ${bg}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex p-1 rounded-xl bg-raised gap-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`flex-1 min-h-[40px] rounded-[10px] text-[14px] font-medium transition-colors ${on ? 'bg-surface text-fg shadow-[0_1px_2px_rgb(0_0_0/0.25)]' : 'text-muted hover:text-fg'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, tone = 'accent' }: { checked: boolean; onChange: (v: boolean) => void; label: string; tone?: 'accent' | 'hiit' | 'steps' }) {
  const on = { accent: 'bg-accent', hiit: 'bg-hiit', steps: 'bg-steps' }[tone];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-11 w-[60px] items-center justify-center shrink-0"
    >
      <span className={`block h-[30px] w-[50px] rounded-full transition-colors ${checked ? on : 'bg-raised border border-line'}`} />
      <span className={`absolute top-1/2 -translate-y-1/2 h-[24px] w-[24px] rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[10px]' : '-translate-x-[10px]'}`} />
    </button>
  );
}

/** Bottom sheet dialog with focus handling and Escape to close. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Keep the latest onClose without re-running the open effect (which would steal focus on every render).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="fade-enter absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="sheet-enter relative w-full max-w-[720px] max-h-[86dvh] overflow-y-auto rounded-t-[22px] bg-surface border-t border-line/60 safe-bottom focus:outline-none"
      >
        <div className="sticky top-0 z-10 bg-surface px-5 pt-3 pb-2">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" aria-hidden />
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="display text-[26px] font-semibold leading-none">{title}</h2>
            <button type="button" onClick={onClose} className="btn-quiet !px-2.5 -mr-2" aria-label="Close">
              <Icon name="close" />
            </button>
          </div>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function ScreenTitle({ eyebrow, title, right }: { eyebrow?: ReactNode; title: ReactNode; right?: ReactNode }) {
  return (
    <header className="safe-top px-4 sm:px-6">
      <div className="flex items-end justify-between gap-3 pt-5 pb-4">
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
          <h1 className="display text-[40px] leading-[0.95] font-bold tracking-tight">{title}</h1>
        </div>
        {right}
      </div>
    </header>
  );
}

export function Empty({ icon, title, body, action }: { icon: Parameters<typeof Icon>[0]['name']; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full border border-line text-muted">
        <Icon name={icon} size={22} />
      </div>
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="mt-1 max-w-[30ch] text-[13.5px] text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, unit, sub }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="eyebrow">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="display text-[30px] font-semibold leading-none">{value}</span>
        {unit && <span className="text-[12.5px] text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-[12.5px] text-muted">{sub}</div>}
    </div>
  );
}
