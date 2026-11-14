import { useEffect, useState } from 'react';
import { isValidKey } from './date';

export type Route =
  | { name: 'today' }
  | { name: 'day'; date: string }
  | { name: 'calendar' }
  | { name: 'progress' }
  | { name: 'plan' }
  | { name: 'settings' }
  | { name: 'profile' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/');
  switch (parts[0]) {
    case 'day':
      return parts[1] && isValidKey(parts[1]) ? { name: 'day', date: parts[1] } : { name: 'today' };
    case 'calendar':
    case 'progress':
    case 'plan':
    case 'settings':
    case 'profile':
      return { name: parts[0] };
    default:
      return { name: 'today' };
  }
}

export function href(r: Route): string {
  return r.name === 'day' ? `#/day/${r.date}` : r.name === 'today' ? '#/' : `#/${r.name}`;
}

export function navigate(r: Route): void {
  window.location.hash = href(r);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
