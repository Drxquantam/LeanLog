import { lazy, Suspense, useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useStore, useToday } from './lib/store';
import { href, useRoute, type Route } from './lib/router';
import { DayEditor } from './screens/Today';
import { useCard } from './lib/useCard';
import { tierIndex, type TierId } from './lib/streak';
import { LevelUp } from './components/LevelUp';
import { useBadgeClearance } from './lib/useBadgeClearance';
import { DesktopSidebar, MobileDrawer, MobileTopBar } from './components/Sidebar';

const CalendarScreen = lazy(() => import('./screens/Calendar'));
const ProgressScreen = lazy(() => import('./screens/Progress'));
const PlanScreen = lazy(() => import('./screens/Plan'));
const SettingsScreen = lazy(() => import('./screens/Settings'));
const ProfileScreen = lazy(() => import('./screens/Profile'));

const TITLES: Record<Route['name'], string> = {
  today: 'Today',
  day: 'Day',
  calendar: 'Calendar',
  progress: 'Progress',
  plan: 'Plan',
  profile: 'Profile',
  settings: 'Settings',
};

const COLLAPSE_KEY = 'leanlog.sidebarCollapsed';

export default function App() {
  const route = useRoute();
  const today = useToday();
  useBadgeClearance();
  const { ready, demo, storageError, settings, updateSettings, setToday } = useStore();
  // A new day can change which workout is due (a missed day carries over).
  useEffect(() => {
    if (ready) setToday(today);
  }, [today, ready, setToday]);
  const card = useCard(today);
  // A tier above the last one celebrated means a new card was just earned.
  const levelUp = ready && tierIndex(card.tier.id) > tierIndex(settings.seenTier as TierId);
  const closeLevelUp = useCallback(() => updateSettings({ seenTier: card.tier.id }), [updateSettings, card.tier.id]);

  const [drawer, setDrawer] = useState(false);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* per-device convenience only */
      }
      return !c;
    });

  // Any navigation closes the phone menu.
  useEffect(() => setDrawer(false), [route]);

  const who = { name: settings.name, tier: card.tier.name, streak: card.current };

  return (
    <div className="min-h-[100dvh]" style={{ '--side-w': collapsed ? '76px' : '248px' } as CSSProperties}>
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-50 btn-primary">Skip to content</a>
      <DesktopSidebar route={route} collapsed={collapsed} onToggle={toggleCollapsed} who={who} />

      <div className="lg:pl-[var(--side-w)] transition-[padding] duration-200">
        <MobileTopBar onMenu={() => setDrawer(true)} who={who} title={TITLES[route.name]} />
        <div className="mx-auto w-full max-w-[720px]">
          {demo && (
            <div className="bg-accent text-on-accent text-center text-[12.5px] font-semibold py-1.5 lg:rounded-b-xl">
              Demo mode · sample data · <a className="underline underline-offset-2" href={href({ name: 'settings' })}>exit in Settings</a>
            </div>
          )}
          {storageError && (
            <div role="alert" className="mx-4 mt-3 rounded-xl border border-line px-4 py-3 text-[13.5px]">
              <strong>Storage problem:</strong> {storageError}. Changes may not be saved in this browser mode.
            </div>
          )}
          <main id="main">
            {!ready ? (
              <div className="h-[60dvh]" aria-busy="true" />
            ) : (
              <Suspense fallback={<div className="h-[60dvh]" aria-busy="true" />}>
                {route.name === 'today' && <DayEditor key={today} date={today} today={today} />}
                {route.name === 'day' && <DayEditor key={route.date} date={route.date} today={today} />}
                {route.name === 'calendar' && <CalendarScreen today={today} />}
                {route.name === 'progress' && <ProgressScreen today={today} />}
                {route.name === 'plan' && <PlanScreen today={today} />}
                {route.name === 'settings' && <SettingsScreen />}
                {route.name === 'profile' && <ProfileScreen today={today} />}
              </Suspense>
            )}
          </main>
        </div>
      </div>

      <MobileDrawer open={drawer} onClose={closeDrawer} route={route} who={who} />
      {levelUp && (
        <LevelUp tier={card.tier} stats={{ current: card.current, best: card.best, total: card.total, since: card.since, week: card.week }} name={settings.name} onClose={closeLevelUp} />
      )}
    </div>
  );
}
