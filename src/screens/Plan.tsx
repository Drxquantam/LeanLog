import { useState } from 'react';
import type { Prescription } from '../lib/types';
import { ROTATION, TEMPLATES, cardioLabel, exerciseName, isCustomized, plannedSetCount, prescriptions, scheduledTemplate } from '../lib/program';
import { useStore } from '../lib/store';
import { addDays, diffDays, fmtShort } from '../lib/date';
import { href } from '../lib/router';
import { Icon } from '../components/Icon';
import { ScreenTitle } from '../components/ui';

/** Read-only view of the rotation: the next week of days in order. Exercises are edited inside a day. */
export default function PlanScreen({ today }: { today: string }) {
  useStore(); // re-render when the program changes
  const days = Array.from({ length: 8 }, (_, i) => addDays(today, i));
  const [open, setOpen] = useState<string | null>(today);

  return (
    <div className="pb-tabbar">
      <ScreenTitle eyebrow="Plan" title="Your rotation" />

      <div className="px-4 sm:px-6">
        <p className="-mt-1 mb-4 text-[13.5px] text-muted">
          {ROTATION.map((id) => TEMPLATES[id].short).join(' → ')}, then it repeats. Tuesday the gym is closed, so it’s always a rest day.
        </p>

        <ul className="divide-y divide-line/70 border-y border-line/70">
          {days.map((date) => {
            const id = scheduledTemplate(date);
            const t = TEMPLATES[id];
            const isOpen = open === date;
            const rel = diffDays(today, date);
            const when = rel === 0 ? 'Today' : rel === 1 ? 'Tomorrow' : fmtShort(date);
            const { main, abs } = prescriptions(id);
            return (
              <li key={date}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : date)}
                  className="flex w-full items-center gap-3 py-3 text-left min-h-[60px]"
                >
                  <span className={`w-[76px] shrink-0 text-[13px] font-semibold ${rel === 0 ? 'text-accent' : 'text-muted'}`}>{when}</span>
                  <span className={`display inline-flex h-[24px] min-w-[38px] items-center justify-center rounded-md px-1.5 text-[14px] font-semibold ${id === 'REST' ? 'text-faint ring-1 ring-inset ring-line' : 'bg-raised'}`}>{t.code}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium">{id === 'REST' ? 'Closed, rest day' : t.name}</span>
                    <span className="block text-[12.5px] text-muted truncate">
                      {[id !== 'REST' ? `${plannedSetCount(id)} sets` : null, t.abs ? 'abs' : null, cardioLabel(id) || null, id !== 'REST' && isCustomized(id) ? 'edited' : null].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <Icon name="chevronDown" size={18} className={`text-faint transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="pb-4 fade-enter">
                    {id === 'REST' ? (
                      <p className="text-[14px] text-muted">Gym closed. Easy walk, hit your steps, keep protein up.</p>
                    ) : (
                      <>
                        <ExList items={main} />
                        {abs.length > 0 && (
                          <>
                            <div className="eyebrow mt-3 mb-1">Abs</div>
                            <ExList items={abs} />
                          </>
                        )}
                        <a href={href(rel === 0 ? { name: 'today' } : { name: 'day', date })} className="btn-quiet -ml-3 mt-2 !min-h-[40px] text-accent">
                          Open this day <Icon name="arrowRight" size={16} />
                        </a>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12.5px] text-faint">
          To change an exercise, open the day and tap the <Icon name="edit" size={13} className="inline -mt-0.5" /> next to it, or use “Add exercise” at the bottom of the list.
        </p>
      </div>
    </div>
  );
}

function ExList({ items }: { items: Prescription[] }) {
  if (items.length === 0) return <p className="text-[14px] text-muted">No exercises.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((p, i) => (
        <li key={`${p.exerciseId}-${i}`} className="flex justify-between gap-3 text-[14px]">
          <span>{exerciseName(p.exerciseId)}</span>
          <span className="shrink-0 text-muted">{p.sets} × {p.target}</span>
        </li>
      ))}
    </ul>
  );
}
