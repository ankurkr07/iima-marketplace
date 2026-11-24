import type { ProductCondition } from './types';

/** ₹ formatting with Indian digit grouping (e.g. ₹52,000). */
export function formatPrice(rupees: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  NEW: 'Brand New',
  LIKE_NEW: 'Like New',
  GOOD: 'Good',
  FAIR: 'Fair',
};

/** Relative time — "2 days ago", "just now". Keeps listings feeling live. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.round((Date.now() - then) / 1000);
  const table: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [604800, 'day'],
    [2629800, 'week'],
    [31557600, 'month'],
    [Infinity, 'year'],
  ];
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  let prev = 1;
  for (const [limit, unit] of table) {
    if (secs < limit) {
      const value = Math.round(secs / prev);
      return rtf.format(-value, unit);
    }
    prev = limit;
  }
  return 'a while ago';
}

export function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * Build a wa.me deep link. Strips formatting; assumes an Indian number and
 * prefixes 91 when a bare 10-digit number is given.
 */
export function whatsappLink(number: string, message?: string): string {
  let digits = number.replace(/[^0-9]/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

const RENTAL_UNIT_LABELS = {
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  BIWEEK: '2 weeks',
  MONTH: 'month',
  YEAR: 'year',
} as const;

/** "hour", "day", "2 weeks"… — the period a rental rate is quoted for. */
export function rentalUnitLabel(unit: keyof typeof RENTAL_UNIT_LABELS | null | undefined): string {
  return RENTAL_UNIT_LABELS[unit ?? 'DAY'];
}
