import { useEffect, useRef } from 'react';
import { href, type Route } from '../lib/router';
import { Icon, type IconName } from './Icon';

export const NAV: { route: Route; label: string; icon: IconName; match: Route['name'][] }[] = [
  { route: { name: 'today' }, label: 'Today', icon: 'today', match: ['today', 'day'] },
  { route: { name: 'calendar' }, label: 'Calendar', icon: 'calendar', match: ['calendar'] },
  { route: { name: 'progress' }, label: 'Progress', icon: 'progress', match: ['progress'] },
  { route: { name: 'plan' }, label: 'Plan', icon: 'plan', match: ['plan'] },
  { route: { name: 'profile' }, label: 'Profile', icon: 'profile', match: ['profile'] },
  { route: { name: 'settings' }, label: 'Settings', icon: 'settings', match: ['settings'] },
];

interface Who {
  name: string;
  tier: string;
  streak: number;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" width={28} height={28} className="rounded-lg shrink-0" />
      {!compact && <span className="display text-[20px] font-bold tracking-[0.12em]">LEAN LOG</span>}
    </span>
  );
}

function NavList({ route, collapsed = false, onNavigate }: { route: Route; collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = n.match.includes(route.name);
        return (
          <li key={n.label}>
            <a
              href={href(n.route)}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              aria-label={collapsed ? n.label : undefined}
              title={collapsed ? n.label : undefined}
              className={`flex min-h-[48px] items-center gap-3 rounded-xl text-[15px] font-medium transition-colors ${collapsed ? 'justify-center px-0' : 'px-3'} ${active ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-raised hover:text-fg'}`}
            >
              <Icon name={n.icon} size={22} className="shrink-0" />
              {!collapsed && <span>{n.label}</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function StreakFoot({ who, collapsed = false }: { who: Who; collapsed?: boolean }) {
  return (
    <a href={href({ name: 'profile' })} className={`flex items-center gap-3 rounded-xl py-2 hover:bg-raised ${collapsed ? 'justify-center' : 'px-3'}`} title={collapsed ? `${who.streak} in a row` : undefined}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-raised text-accent">
        <Icon name="flame" size={18} />
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold">{who.name}</span>
          <span className="block text-[12.5px] text-muted">{who.tier} · {who.streak} in a row</span>
        </span>
      )}
    </a>
  );
}

/** Desktop: a sidebar that stays on the left and collapses to an icon rail. */
export function DesktopSidebar({ route, collapsed, onToggle, who }: { route: Route; collapsed: boolean; onToggle: () => void; who: Who }) {
  return (
    <aside
      aria-label="Main"
      className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line/70 bg-bg lg:flex transition-[width] duration-200"
      style={{ width: 'var(--side-w)' }}
    >
      <div className={`flex h-[68px] items-center ${collapsed ? 'justify-center' : 'justify-between px-4'}`}>
        {!collapsed && <a href={href({ name: 'today' })} aria-label="Lean Log, go to Today"><Brand /></a>}
        <button type="button" onClick={onToggle} className="btn-quiet !px-2.5" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}>
          <Icon name="sidebar" size={20} />
        </button>
      </div>
      <nav aria-label="Sections" className={`flex-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        <NavList route={route} collapsed={collapsed} />
      </nav>
      <div className={`border-t border-line/70 py-3 ${collapsed ? 'px-2' : 'px-3'}`}>
        <StreakFoot who={who} collapsed={collapsed} />
      </div>
    </aside>
  );
}

/** Phone: a slim top bar with a menu button. */
export function MobileTopBar({ onMenu, who, title }: { onMenu: () => void; who: Who; title: string }) {
  return (
    <div className="sticky top-0 z-20 border-b border-line/60 bg-bg/95 backdrop-blur-md lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex h-[54px] items-center gap-1 px-2">
        <button type="button" onClick={onMenu} className="btn-quiet !px-3" aria-label="Open menu" aria-haspopup="dialog">
          <Icon name="menu" size={24} />
        </button>
        <span className="flex-1 truncate text-[15px] font-semibold">{title}</span>
        <a href={href({ name: 'profile' })} className="flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-[14px] font-semibold hover:bg-raised" aria-label={`Streak ${who.streak} workouts in a row. Open profile`}>
          <Icon name="flame" size={18} className="text-accent" />
          <span className="display text-[20px]">{who.streak}</span>
        </a>
      </div>
    </div>
  );
}

/** Phone: the sidebar slides in over the page. Closes on navigate, backdrop tap, swipe-free Escape. */
export function MobileDrawer({ open, onClose, route, who }: { open: boolean; onClose: () => void; route: Route; who: Who }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('a[aria-current="page"], a')?.focus();
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

  return (
    <div className={`fixed inset-0 z-40 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/55 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`absolute inset-y-0 left-0 flex w-[min(300px,84vw)] flex-col border-r border-line/70 bg-surface shadow-[8px_0_40px_rgb(0_0_0/0.4)] transition-transform duration-[260ms] ease-[cubic-bezier(.2,.8,.2,1)] ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(env(safe-area-inset-bottom) + var(--dock-extra, 0px))' }}
      >
        <div className="flex h-[64px] items-center justify-between px-4">
          <Brand />
          <button type="button" onClick={onClose} className="btn-quiet !px-2.5 -mr-1" aria-label="Close menu" tabIndex={open ? 0 : -1}>
            <Icon name="close" size={22} />
          </button>
        </div>
        <nav aria-label="Sections" className="flex-1 overflow-y-auto px-3 pt-1">
          {open && <NavList route={route} onNavigate={onClose} />}
        </nav>
        <div className="border-t border-line/70 px-3 py-3">
          {open && <StreakFoot who={who} />}
        </div>
      </div>
    </div>
  );
}
