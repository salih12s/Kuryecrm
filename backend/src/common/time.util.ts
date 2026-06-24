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
