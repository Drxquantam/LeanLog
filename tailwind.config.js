/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: c('bg'),
      surface: c('surface'),
      raised: c('raised'),
      line: c('line'),
      fg: c('fg'),
      muted: c('muted'),
      faint: c('faint'),
      accent: c('accent'),
      'on-accent': c('on-accent'),
      hiit: c('hiit'),
      steps: c('steps'),
      cal: c('cal'),
    },
    fontFamily: {
      sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      display: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
    },
    extend: {
      borderRadius: { xl: '14px', '2xl': '18px' },
    },
  },
  plugins: [],
};
