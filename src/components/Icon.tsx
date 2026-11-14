/** Custom line-icon set: 24px grid, 1.75 stroke, round caps and joins. */
const PATHS = {
  today: 'M4 9.5h16M8 3.5v3M16 3.5v3M6 5.5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2ZM12 13v3.5M10.25 14.75h3.5',
  calendar: 'M4 9.5h16M8 3.5v3M16 3.5v3M6 5.5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2ZM8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01',
  progress: 'M4 4v16h16M7.5 15l3.5-4 3 2.5L19 8',
  plan: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.5 7.5 0 0 1-2.1 1.2L14.7 21h-4l-.3-2.4a7.5 7.5 0 0 1-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7.6 7.6 0 0 1 0-3L4.4 9.3l2-3.4 1.9.7a7.5 7.5 0 0 1 2.1-1.2L10.7 3h4l.3 2.4a7.5 7.5 0 0 1 2.1 1.2l1.9-.7 2 3.4-1.6 1.2a7.6 7.6 0 0 1 0 3Z',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c.8-3.6 3.8-6 7.5-6s6.7 2.4 7.5 6',
  menu: 'M4 7h16M4 12h16M4 17h11',
  sidebar: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM9.5 4v16',
  edit: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevronLeft: 'M14.5 6l-6 6 6 6',
  chevronRight: 'M9.5 6l6 6-6 6',
  chevronDown: 'M6 9.5l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 9v4l2.5 1.5M9.5 2.5h5',
  bolt: 'M13 3L5.5 13.5H12L11 21l7.5-10.5H12L13 3Z',
  walk: 'M13 4.5a1.5 1.5 0 1 0 0-.01M10 21l2-6 2.5 2.5V21M8 12l2-4.5 3.5 1 2.5 3.5 2 .5M10 7.5l-.5 5L12 15',
  steps: 'M7 4c1.7 0 2.5 1.8 2.5 4S8.7 12 7 12 4.5 10.2 4.5 8 5.3 4 7 4ZM5 15.5h4M17 8c1.7 0 2.5 1.8 2.5 4s-.8 4-2.5 4-2.5-1.8-2.5-4 .8-4 2.5-4ZM15 19.5h4',
  scale: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM8.5 9.5a5 5 0 0 1 7 0M12 9.5l1.25-2',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5v1.5A2.5 2.5 0 0 0 7.5 10H8M16 6h3v1.5a2.5 2.5 0 0 1-2.5 2.5H16M12 13v4M8.5 20h7M9.5 17h5v3h-5z',
  download: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14',
  upload: 'M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19.5h14',
  flask: 'M9.5 3.5h5M10.5 3.5v6L5 18.5a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2L13.5 9.5v-6M7.5 15h9',
  alert: 'M12 4l9 16H3l9-16ZM12 10v4.5M12 17.5h.01',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  swap: 'M7 7h12l-3.5-3.5M17 17H5l3.5 3.5',
  moon: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z',
  flame: 'M12 21c3.6 0 6-2.4 6-5.8 0-3.5-2.5-5.2-3.5-8.2-.4 2-1.6 3-2.7 3.2C12.3 7.5 11 5 8.5 3.5c.4 3.3-2.5 6-2.5 10.2C6 18.4 8.4 21 12 21Z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className = '', label }: { name: IconName; size?: number; className?: string; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
