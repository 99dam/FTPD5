export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const dateTimeFmt = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
const dateFmt = new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' });
const numberFmt = new Intl.NumberFormat('th-TH');

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : dateTimeFmt.format(d);
}

export function formatToday(): string {
  return dateFmt.format(new Date());
}

export function formatNumber(n: number | null | undefined): string {
  return numberFmt.format(n ?? 0);
}

export function formatSequence(n: number): string {
  return String(n).padStart(3, '0');
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function initials(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : trimmed.slice(0, 2);
}

/** Converts '' to null for optional text columns. */
export function emptyToNull(value: string | null | undefined): string | null {
  const v = (value ?? '').trim();
  return v === '' ? null : v;
}
