import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AdvanceStatus,
  CourierPaymentStatus,
  InvoiceStatus,
  PaymentStatus,
  Prisma,
  ShiftConfirmationStatus,
  ShiftStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { durationHours, round2 } from '../common/time.util';
import { restaurantRevenueBreakdown, restaurantTimeRange, shiftServiceAmountForRestaurant } from '../common/shift-calc.util';

/** Optional inclusive date-range filter on a shift's `date` field. */
function dateFilter(from?: string, to?: string): Prisma.ShiftWhereInput {
  if (!from && !to) return {};
  return { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } };
}

/** Optional inclusive date-range filter on a payment's `paymentDate` field. */
function paymentDateFilter(from?: string, to?: string): { paymentDate?: { gte?: string; lte?: string } } {
  if (!from && !to) return {};
  return { paymentDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } };
}

/** Only fully-approved shifts feed the money calculations. */
const APPROVED_WHERE = {
  status: ShiftStatus.COMPLETED,
  confirmationStatus: ShiftConfirmationStatus.ADMIN_APPROVED,
  approvedStartTime: { not: null },
  approvedEndTime: { not: null },
} satisfies Prisma.ShiftWhereInput;

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- COURIER

  /**
   * Courier earnings summary. Safe for BOTH admin and the courier's own panel:
   * it never exposes restaurant rates — only the courier's snapshot/earnings.
   */
  async courierSummary(courierId: string) {
    const courier = await this.prisma.courier.findUnique({ where: { id: courierId } });
    if (!courier) throw new NotFoundException('Kurye bulunamadı.');

    const shifts = await this.prisma.shift.findMany({
      where: { courierId, ...APPROVED_WHERE },
      include: {
        restaurant: { select: { id: true, name: true } },
        segments: { include: { restaurant: { select: { id: true, name: true } } }, orderBy: { sequence: 'asc' } },
      },
      orderBy: [{ date: 'desc' }],
    });

    let totalWorkHours = 0;
    let totalEarnings = 0;
    const shiftItems = shifts.map((s) => {
      const hours = durationHours(s.approvedStartTime as string, s.approvedEndTime as string);
      const rate = Number(s.courierHourlyRateSnapshot);
      const earning = hours * rate;
      totalWorkHours += hours;
      totalEarnings += earning;
      // Per-restaurant breakdown for shifts split across restaurants, so the
      // courier sees how long they worked at each and what it earns them.
      const parts = restaurantRevenueBreakdown(s);
      const restaurants =
        parts.length > 1
          ? parts.map((p) => {
              const range = restaurantTimeRange(s, p.restaurantId);
              return {
                restaurantName: p.restaurantName,
                startTime: range.start,
                endTime: range.end,
                hours: round2(p.hours),
                earning: round2(p.hours * rate),
              };
            })
          : [];
      return {
        id: s.id,
        date: s.date,
        restaurantName: s.restaurant.name,
        approvedStartTime: s.approvedStartTime,
        approvedEndTime: s.approvedEndTime,
        workHours: round2(hours),
        hourlyRate: s.courierHourlyRateSnapshot.toString(),
        earning: round2(earning),
        restaurants,
      };
    });

    const advances = await this.prisma.courierAdvance.findMany({
      where: { courierId },
      orderBy: [{ advanceDate: 'desc' }],
    });
    const totalActiveAdvances = advances
      .filter((a) => a.status === AdvanceStatus.ACTIVE)
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const payments = await this.prisma.courierPayment.findMany({
      where: { courierId },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    });
    const totalActivePayments = payments
      .filter((payment) => payment.status === CourierPaymentStatus.ACTIVE)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    return {
      courier: { id: courier.id, name: courier.name, phone: courier.phone, isActive: courier.isActive },
      totalWorkHours: round2(totalWorkHours),
      totalEarnings: round2(totalEarnings),
      totalActiveAdvances: round2(totalActiveAdvances),
      totalActivePayments: round2(totalActivePayments),
      remainingPayable: round2(totalEarnings - totalActiveAdvances - totalActivePayments),
      shifts: shiftItems,
      advances: advances.map((a) => ({
        id: a.id,
        amount: a.amount.toString(),
        advanceDate: a.advanceDate,
        note: a.note,
        status: a.status,
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount.toString(),
        paymentDate: payment.paymentDate,
        method: payment.method,
        note: payment.note,
        status: payment.status,
      })),
    };
  }

  // ---------------------------------------------------------------- RESTAURANT

  /**
   * Restaurant account summary. Safe for the restaurant's own panel by default:
   * it exposes only the restaurant's own service amount (their rate). When
   * `includeCourierCost` is true (admin only) each shift row also carries the
   * courier's earning for that portion, which restaurants must never see.
   */
  async restaurantSummary(restaurantId: string, includeCourierCost = false, from?: string, to?: string) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException('Restoran bulunamadı.');

    const dateRange = dateFilter(from, to);
    const paymentRange = paymentDateFilter(from, to);

    // Include shifts where this restaurant is the primary one OR where the
    // courier switched into this restaurant for part of the shift (a segment).
    const shifts = await this.prisma.shift.findMany({
      where: {
        ...APPROVED_WHERE,
        ...dateRange,
        OR: [{ restaurantId }, { segments: { some: { restaurantId } } }],
      },
      include: {
        courier: { select: { name: true } },
        segments: { include: { restaurant: { select: { id: true, name: true } } }, orderBy: { sequence: 'asc' } },
      },
      orderBy: [{ date: 'desc' }],
    });

    let totalWorkHours = 0;
    let totalServiceAmount = 0;
    const shiftItems = shifts.map((s) => {
      // Only this restaurant's portion of the (possibly multi-restaurant) shift.
      const portion = shiftServiceAmountForRestaurant(s, restaurantId);
      // The actual worked interval at this restaurant (segment range), so the
      // displayed hours match the displayed time window.
      const range = restaurantTimeRange(s, restaurantId);
      totalWorkHours += portion.hours;
      totalServiceAmount += portion.amount;
      return {
        id: s.id,
        date: s.date,
        courierName: s.courier.name,
        approvedStartTime: range.start,
        approvedEndTime: range.end,
        workHours: round2(portion.hours),
        hourlyRate: s.restaurantHourlyRateSnapshot.toString(),
        serviceAmount: round2(portion.amount),
        // Admin-only: what the courier earns for this portion of the shift.
        ...(includeCourierCost
          ? { courierEarning: round2(portion.hours * Number(s.courierHourlyRateSnapshot)) }
          : {}),
      };
    });

    const invoices = await this.prisma.restaurantInvoice.findMany({
      where: { restaurantId },
      orderBy: [{ invoiceDate: 'desc' }],
    });
    const payments = await this.prisma.restaurantPayment.findMany({
      where: { restaurantId, ...paymentRange },
      orderBy: [{ paymentDate: 'desc' }],
    });

    const totalInvoiced = invoices
      .filter((i) => i.status !== InvoiceStatus.CANCELLED)
      .reduce((sum, i) => sum + Number(i.amount), 0);
    const totalPaid = payments
      .filter((p) => p.status === PaymentStatus.ACTIVE)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        authorizedPerson: restaurant.authorizedPerson,
        phone: restaurant.phone,
        isActive: restaurant.isActive,
      },
      totalWorkHours: round2(totalWorkHours),
      totalServiceAmount: round2(totalServiceAmount),
      totalInvoiced: round2(totalInvoiced),
      totalPaid: round2(totalPaid),
      // Debt is service rendered minus payments. Invoices are informational.
      remainingBalance: round2(totalServiceAmount - totalPaid),
      shifts: shiftItems,
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNo: i.invoiceNo,
        invoiceDate: i.invoiceDate,
        periodStart: i.periodStart,
        periodEnd: i.periodEnd,
        amount: i.amount.toString(),
        note: i.note,
        status: i.status,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        paymentDate: p.paymentDate,
        amount: p.amount.toString(),
        method: p.method,
        note: p.note,
        status: p.status,
      })),
    };
  }

  /** Admin restaurant-cari list: each restaurant with service/payment totals. */
  async restaurantAccountsList(from?: string, to?: string) {
    const paymentRange = paymentDateFilter(from, to);
    const [restaurants, shifts] = await Promise.all([
      this.prisma.restaurant.findMany({
        where: { deletedAt: null },
        orderBy: [{ name: 'asc' }],
        include: {
          invoices: { select: { amount: true, status: true } },
          payments: { where: paymentRange, select: { amount: true, status: true } },
        },
      }),
      this.prisma.shift.findMany({
        where: { ...APPROVED_WHERE, ...dateFilter(from, to) },
        include: {
          segments: { include: { restaurant: { select: { id: true, name: true } } }, orderBy: { sequence: 'asc' } },
        },
      }),
    ]);

    // Sum each restaurant's service amount across all approved (possibly
    // multi-restaurant) shifts.
    const serviceByRestaurant = new Map<string, number>();
    for (const shift of shifts) {
      for (const part of restaurantRevenueBreakdown(shift)) {
        serviceByRestaurant.set(part.restaurantId, (serviceByRestaurant.get(part.restaurantId) ?? 0) + part.amount);
      }
    }

    return restaurants.map((r) => {
      const totalInvoiced = r.invoices
        .filter((i) => i.status !== InvoiceStatus.CANCELLED)
        .reduce((sum, i) => sum + Number(i.amount), 0);
      const totalPaid = r.payments
        .filter((p) => p.status === PaymentStatus.ACTIVE)
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const totalServiceAmount = serviceByRestaurant.get(r.id) ?? 0;
      return {
        id: r.id,
        name: r.name,
        isActive: r.isActive,
        totalServiceAmount: round2(totalServiceAmount),
        totalInvoiced: round2(totalInvoiced),
        totalPaid: round2(totalPaid),
        // Debt is service rendered minus payments. Invoices are informational.
        remainingBalance: round2(totalServiceAmount - totalPaid),
      };
    });
  }
}
