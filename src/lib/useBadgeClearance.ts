import { useEffect } from 'react';

/**
 * Netlify's free plan injects a "Powered by Netlify" badge (a fixed iframe at the bottom-right)
 * that would sit on top of the tab bar. When it's present, raise everything docked to the bottom
 * by --dock-extra so every tab stays tappable. On any host without the badge, this stays 0px.
 */
const BADGE_IDS = ['nl-badge-frame', 'nl-hud-frame'];
const MAX_CLEARANCE_PX = 120; // never give up more than this, whatever the badge does

function measure(): number {
  for (const id of BADGE_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const visible = r.height > 0 && r.width > 0 && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
    // Clear the whole frame (about 92px), not just the visible pill, so its edges can't swallow taps.
    if (visible && r.bottom >= window.innerHeight - 4) return Math.min(MAX_CLEARANCE_PX, Math.ceil(window.innerHeight - r.top));
  }
  return 0;
}

export function useBadgeClearance(): void {
  useEffect(() => {
    const root = document.documentElement;
    let last = -1;
    const update = () => {
      const px = measure();
      if (px !== last) {
        last = px;
        root.style.setProperty('--dock-extra', `${px}px`);
      }
    };
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.body, { childList: true, subtree: false, attributes: true, attributeFilter: ['style'] });
    // The badge resizes itself (mini/expanded) without DOM changes we can see, so re-check now and then.
    const id = window.setInterval(update, 2000);
    window.addEventListener('resize', update);
    return () => {
      mo.disconnect();
      window.clearInterval(id);
      window.removeEventListener('resize', update);
    };
  }, []);
}
