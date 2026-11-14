/** Date helpers. All keys are local-time "YYYY-MM-DD" strings. */

const pad = (n: number): string => String(n).padStart(2, '0');

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
}

/** 0 = Monday ... 6 = Sunday */
export function weekdayMon(key: string): number {
  return (fromKey(key).getDay() + 6) % 7;
}

export function startOfWeek(key: string): string {
  return addDays(key, -weekdayMon(key));
}

export function isValidKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && toKey(fromKey(key)) === key;
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

export const dowShort = (key: string): string => DOW[weekdayMon(key)] ?? '';
export const dowLong = (key: string): string => DOW_LONG[weekdayMon(key)] ?? '';
export const DOW_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
export const DOW_NAMES = DOW;

/** "Mon 9 Nov" */
export function fmtShort(key: string): string {
  const d = fromKey(key);
  return `${dowShort(key)} ${d.getDate()} ${MON[d.getMonth()]}`;
}

/** "9 Nov" */
export function fmtDayMonth(key: string): string {
  const d = fromKey(key);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

export function fmtMonthYear(year: number, month: number): string {
  return `${MON_LONG[month]} ${year}`;
}

export function monthShort(key: string): string {
  return MON[fromKey(key).getMonth()] ?? '';
}
