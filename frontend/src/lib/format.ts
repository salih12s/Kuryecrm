/** Formats a numeric/string amount as Turkish Lira, e.g. "150,50 ₺". */
export function formatTL(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return String(value);
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(num);
}

/** Formats a "YYYY-MM-DD" string as a tr-TR date, e.g. "24.06.2026". */
export function formatDateTR(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat('tr-TR').format(d);
}

/** Renders a start-end time pair, falling back to a dash. */
export function timeRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return '—';
  return `${start ?? '—'} - ${end ?? '—'}`;
}
