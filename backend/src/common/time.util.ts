/** Shared time helpers for "HH:mm" strings. */

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Duration in hours between two "HH:mm" times, midnight-crossover aware.
 * 09:00-17:00 => 8, 22:00-02:00 => 4. Equal times => 0.
 */
export function durationHours(start: string, end: string): number {
  const diff = (toMinutes(end) - toMinutes(start) + 1440) % 1440;
  return diff / 60;
}

/** True when start and end differ (the only ordering rule once crossover is allowed). */
export function timesDiffer(start: string, end: string): boolean {
  return toMinutes(start) !== toMinutes(end);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Late-start in minutes: how much later the actual start is than the planned
 * start. 0 when on time or early. Midnight-crossover aware (a small forward
 * difference within the same window). Returns 0 if either time is missing.
 */
export function lateMinutes(plannedStart?: string | null, actualStart?: string | null): number {
  if (!plannedStart || !actualStart) return 0;
  const diff = (toMinutes(actualStart) - toMinutes(plannedStart) + 1440) % 1440;
  // A diff close to a full day means the actual start was earlier than planned;
  // treat anything over 12h as "not late" rather than a huge late value.
  return diff > 720 ? 0 : diff;
}

/**
 * Splits the actual worked interval into normal vs overtime hours relative to
 * the planned end. Overtime is the portion worked beyond the planned end time.
 *
 * planned 10:00-18:00, actual 10:00-20:00 => normal 8h, overtime 2h, total 10h.
 * planned 10:00-18:00, actual 10:30-18:00 => normal 7.5h, overtime 0, total 7.5h.
 */
export function splitNormalOvertime(
  plannedEnd: string,
  actualStart: string,
  actualEnd: string,
): { normalHours: number; overtimeHours: number; totalHours: number } {
  const total = durationHours(actualStart, actualEnd);
  // Overtime = minutes the actual end runs past the planned end, but never
  // more than the total worked time.
  const pastPlanned = (toMinutes(actualEnd) - toMinutes(plannedEnd) + 1440) % 1440;
  const overtimeMinutes = pastPlanned > 720 ? 0 : pastPlanned;
  const overtimeHours = Math.min(overtimeMinutes / 60, total);
  return {
    normalHours: round2(total - overtimeHours),
    overtimeHours: round2(overtimeHours),
    totalHours: round2(total),
  };
}
