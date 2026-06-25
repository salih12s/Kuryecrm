/**
 * Segment-aware revenue helpers shared by shifts, reports and finance.
 *
 * A shift can be worked across more than one restaurant (ShiftSegment rows).
 * Shifts with NO segments are treated as a single interval at the shift's own
 * restaurant — this keeps all historical (single-restaurant) shifts unchanged.
 */
import { durationHours, round2 } from './time.util';

export interface SegmentLike {
  restaurantId: string;
  restaurantHourlyRateSnapshot: { toString(): string } | number | string;
  startTime: string;
  endTime: string | null;
  sequence: number;
  restaurant?: { id: string; name: string } | null;
}

export interface ShiftLike {
  restaurantId: string;
  restaurantHourlyRateSnapshot: { toString(): string } | number | string;
  approvedStartTime: string | null;
  approvedEndTime: string | null;
  plannedEndTime: string;
  restaurant?: { id: string; name: string } | null;
  segments?: SegmentLike[];
}

export interface RestaurantRevenue {
  restaurantId: string;
  restaurantName: string | null;
  hours: number;
  amount: number;
}

/**
 * Per-restaurant work hours and service amount for one APPROVED shift, using
 * the segment timeline when present. The open segment (endTime === null) is
 * closed at the shift's approved end time.
 */
export function restaurantRevenueBreakdown(shift: ShiftLike): RestaurantRevenue[] {
  const start = shift.approvedStartTime;
  const end = shift.approvedEndTime;
  if (!start || !end) return [];

  const segments = (shift.segments ?? []).slice().sort((a, b) => a.sequence - b.sequence);

  if (segments.length === 0) {
    const hours = durationHours(start, end);
    return [
      {
        restaurantId: shift.restaurantId,
        restaurantName: shift.restaurant?.name ?? null,
        hours: round2(hours),
        amount: round2(hours * Number(shift.restaurantHourlyRateSnapshot)),
      },
    ];
  }

  const grouped = new Map<string, RestaurantRevenue>();
  for (const seg of segments) {
    const segEnd = seg.endTime ?? end;
    const hours = durationHours(seg.startTime, segEnd);
    const amount = hours * Number(seg.restaurantHourlyRateSnapshot);
    const current = grouped.get(seg.restaurantId) ?? {
      restaurantId: seg.restaurantId,
      restaurantName: seg.restaurant?.name ?? null,
      hours: 0,
      amount: 0,
    };
    current.hours += hours;
    current.amount += amount;
    grouped.set(seg.restaurantId, current);
  }
  return [...grouped.values()].map((r) => ({
    ...r,
    hours: round2(r.hours),
    amount: round2(r.amount),
  }));
}

/** Total restaurant-side service amount for a shift across all its segments. */
export function shiftServiceAmount(shift: ShiftLike): number {
  return round2(restaurantRevenueBreakdown(shift).reduce((sum, r) => sum + r.amount, 0));
}

/** Service amount attributable to a single restaurant within a shift. */
export function shiftServiceAmountForRestaurant(shift: ShiftLike, restaurantId: string): { hours: number; amount: number } {
  const row = restaurantRevenueBreakdown(shift).find((r) => r.restaurantId === restaurantId);
  return { hours: row?.hours ?? 0, amount: row?.amount ?? 0 };
}

/**
 * The actual worked time interval at one restaurant within a shift. For a
 * single-restaurant shift this is the whole approved window; for a shift split
 * across restaurants it is that restaurant's segment range (the open segment is
 * closed at the shift's approved end).
 */
export function restaurantTimeRange(shift: ShiftLike, restaurantId: string): { start: string | null; end: string | null } {
  const segments = (shift.segments ?? []).slice().sort((a, b) => a.sequence - b.sequence);
  if (segments.length === 0) {
    return shift.restaurantId === restaurantId
      ? { start: shift.approvedStartTime, end: shift.approvedEndTime }
      : { start: null, end: null };
  }
  const mine = segments.filter((s) => s.restaurantId === restaurantId);
  if (mine.length === 0) return { start: null, end: null };
  return { start: mine[0].startTime, end: mine[mine.length - 1].endTime ?? shift.approvedEndTime };
}
