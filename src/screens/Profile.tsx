import { useState } from 'react';
import { useStore } from '../lib/store';
import { useCard } from '../lib/useCard';
import { TIERS, nextTier, quoteFor, tierIndex, type Tier, type TierId } from '../lib/streak';
import { scheduledTemplate } from '../lib/program';
import { href } from '../lib/router';
import { GymCard } from '../components/GymCard';
import { LevelUp } from '../components/LevelUp';
import { Icon } from '../components/Icon';
import { ProgressBar } from '../components/ui';

const DEV = import.meta.env.DEV;

export default function ProfileScreen({ today }: { today: string }) {
  const { settings, updateSettings, byDate } = useStore();
  const card = useCard(today);
  const [preview, setPreview] = useState<TierId | null>(null);
  const [replay, setReplay] = useState<Tier | null>(null);
  const [editing, setEditing] = useState(false);
  const shown = preview ?? card.tier.id;
  const shownLocked = tierIndex(shown) > tierIndex(card.tier.id) && !DEV;
  const next = nextTier(card.tier);
  const todayTpl = byDate.get(today)?.templateId ?? scheduledTemplate(today);
  const stats = { current: card.current, best: card.best, total: card.total, since: card.since, week: card.week };

  const status = card.trainedToday
    ? 'Trained today. Streak extended.'
    : todayTpl === 'REST'
      ? 'Rest day. Your streak is safe.'
      : card.current > 0
        ? 'Train today to keep the streak alive.'
        : 'Log a workout today to start a streak.';

  return (
    <div className="pb-tabbar">
      <header className="safe-top px-4 sm:px-6">
        <div className="flex items-end justify-between gap-3 pt-5">
          <div className="min-w-0">
            <div className="eyebrow mb-1">Profile</div>
            {editing ? (
              <input
                autoFocus
                defaultValue={settings.name}
                maxLength={24}
                aria-label="Name on card"
                className="field !h-12 display text-[28px] font-bold"
                onBlur={(e) => {
                  updateSettings({ name: e.target.value.trim() || 'Athlete' });
                  setEditing(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="group flex items-center gap-2 text-left" aria-label={`Edit name, currently ${settings.name}`}>
                <h1 className="display truncate text-[40px] leading-[0.95] font-bold tracking-tight">{settings.name}</h1>
                <span className="text-faint group-hover:text-muted text-[13px] font-medium">Edit</span>
              </button>
            )}
          </div>
          <a href={href({ name: 'settings' })} className="btn-quiet !px-2.5 -mr-2" aria-label="Settings"><Icon name="settings" size={22} /></a>
        </div>
      </header>

      <div className="mt-2 pt-2" style={{ overflowX: 'clip', overflowClipMargin: '0px' }}>
        <GymCard tier={shown} stats={stats} name={settings.name} locked={shownLocked} />
      </div>

      <div className="px-4 sm:px-6">
        {preview && preview !== card.tier.id && (
          <div className="-mt-3 mb-4 flex justify-center">
            <button type="button" className="btn-quiet !min-h-[40px] text-[13px]" onClick={() => setPreview(null)}>
              {DEV && tierIndex(preview) > tierIndex(card.tier.id) ? 'Dev preview · ' : 'Previewing · '}back to my card
            </button>
          </div>
        )}

        <p className="text-center text-[14px] text-muted">{status}</p>

        {next ? (
          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between text-[13px]">
              <span className="text-muted">Next card <span className="font-semibold text-fg">{next.id === 'apex' ? 'Final card' : next.name}</span></span>
              <span className="text-muted"><span className="display text-[18px] font-semibold text-fg">{Math.max(0, next.min - card.best)}</span> more in a row</span>
            </div>
            <ProgressBar value={card.best - card.tier.min} max={next.min - card.tier.min} label={`Progress to ${next.name}`} />
            <p className="mt-1.5 text-[12px] text-faint">Cards unlock from your best streak, so a missed day never takes one away.</p>
          </div>
        ) : (
          <p className="mt-4 text-center text-[13px] font-semibold text-accent">Every card unlocked.</p>
        )}

        <section aria-labelledby="quote-h" className="mt-9">
          <h2 id="quote-h" className="eyebrow mb-2">Quote of the day</h2>
          <blockquote className="display text-[30px] leading-[1.05] font-semibold">
            “{quoteFor(today)}”
          </blockquote>
        </section>

        <section aria-labelledby="stats-h" className="mt-9">
          <h2 id="stats-h" className="sr-only">Streak stats</h2>
          <dl className="grid grid-cols-4 gap-3">
            {[
              { k: 'Streak', v: card.current },
              { k: 'Best', v: card.best },
              { k: 'Workouts', v: card.total },
              { k: 'This week', v: `${card.week}/6` },
            ].map((s) => (
              <div key={s.k}>
                <dt className="eyebrow">{s.k}</dt>
                <dd className="display mt-0.5 text-[30px] font-semibold leading-none">{s.v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="tiers-h" className="mt-9">
          <h2 id="tiers-h" className="display text-[22px] font-semibold uppercase tracking-wide mb-2">Cards</h2>
          <ul className="divide-y divide-line/70 border-y border-line/70">
            {TIERS.map((t) => {
              const unlocked = tierIndex(t.id) <= tierIndex(card.tier.id);
              const isCurrent = t.id === card.tier.id;
              const secret = t.id === 'apex' && !unlocked;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setPreview(t.id === card.tier.id ? null : t.id)}
                    aria-pressed={shown === t.id}
                    className="flex w-full items-center gap-3 py-3 text-left min-h-[60px] disabled:cursor-default"
                  >
                    <span className={`tier-dot tier-dot-${t.id} ${unlocked ? '' : 'opacity-35 grayscale'}`} aria-hidden />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold">
                        {secret ? '???' : t.name}
                        {isCurrent && <span className="ml-2 text-[12px] font-medium text-accent">Current</span>}
                      </span>
                      <span className="block text-[12.5px] text-muted">{secret ? 'The final card. Unlock it to find out.' : t.blurb}</span>
                    </span>
                    <span className="text-[12.5px] text-muted shrink-0">
                      {unlocked ? <Icon name="check" size={18} className="text-accent" /> : `${t.min}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {DEV && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-[12px] text-faint w-full">Dev only (hidden in the installed app): preview the unlock animation.</span>
              {TIERS.slice(1).map((t) => (
                <button key={t.id} type="button" className="btn-outline !min-h-[40px] !px-3 text-[13px]" onClick={() => setReplay(t)}>{t.name}</button>
              ))}
            </div>
          )}
        </section>
      </div>

      {replay && <LevelUp tier={replay} stats={stats} name={settings.name} onClose={() => setReplay(null)} />}
    </div>
  );
}
