import { Injectable } from '@nestjs/common';
import {
  AdvanceStatus,
  CourierPaymentStatus,
  FinanceTransactionStatus,
  FinanceTransactionType,
  InvoiceStatus,
  PaymentStatus,
  Prisma,
  ShiftConfirmationStatus,
  ShiftStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { durationHours, lateMinutes, round2, splitNormalOvertime } from '../common/time.util';
import { restaurantRevenueBreakdown, shiftServiceAmount } from '../common/shift-calc.util';

const APPROVED = {
  status: ShiftStatus.COMPLETED,
  confirmationStatus: ShiftConfirmationStatus.ADMIN_APPROVED,
  approvedStartTime: { not: null },
  approvedEndTime: { not: null },
} satisfies Prisma.ShiftWhereInput;

const reportShiftInclude = {
  restaurant: { select: { id: true, name: true } },
  courier: { select: { id: true, name: true } },
  segments: { include: { restaurant: { select: { id: true, name: true } } }, orderBy: { sequence: 'asc' } },
} satisfies Prisma.ShiftInclude;

type ReportShift = Prisma.ShiftGetPayload<{ include: typeof reportShiftInclude }>;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private shiftItem(shift: ReportShift) {
    const start = shift.approvedStartTime as string;
    const end = shift.approvedEndTime as string;
    // Courier hours/earning span the whole shift (the courier worked it all),
    // regardless of how many restaurants it was split across.
    const workHours = durationHours(start, end);
    const restaurantServiceAmount = shiftServiceAmount(shift);
    const courierEarning = workHours * Number(shift.courierHourlyRateSnapshot);
    // Lateness reflects when the courier actually started (their own reported
    // time). Approving a clean start time for payment must not erase the fact
    // that the courier reported starting late.
    const late = lateMinutes(shift.plannedStartTime, shift.courierReportedStartTime ?? start);
    const split = splitNormalOvertime(shift.plannedEndTime, start, end);
    return {
      id: shift.id,
      date: shift.date,
      restaurantId: shift.restaurantId,
      restaurantName: shift.restaurant.name,
      courierId: shift.courierId,
      courierName: shift.courier.name,
      plannedStartTime: shift.plannedStartTime,
      plannedEndTime: shift.plannedEndTime,
      approvedStartTime: start,
      approvedEndTime: end,
      actualStartTime: start,
      actualEndTime: end,
      lateMinutes: late,
      isLate: late > 0,
      normalHours: split.normalHours,
      overtimeHours: split.overtimeHours,
      totalWorkHours: split.totalHours,
      workHours: round2(workHours),
      restaurantServiceAmount,
      courierEarning: round2(courierEarning),
      grossDifference: round2(restaurantServiceAmount - courierEarning),
      // Per-restaurant split (multiple entries only when the courier switched
      // restaurants mid-shift).
      restaurants: restaurantRevenueBreakdown(shift),
    };
  }

  private async movements(startDate: string, endDate: string) {
    const [transactions, payments, advances, courierPayments] = await Promise.all([
      this.prisma.financeTransaction.findMany({
        where: { transactionDate: { gte: startDate, lte: endDate }, status: FinanceTransactionStatus.ACTIVE },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.restaurantPayment.findMany({
        where: { paymentDate: { gte: startDate, lte: endDate }, status: PaymentStatus.ACTIVE },
        include: { restaurant: { select: { name: true } } },
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.courierAdvance.findMany({
        where: { advanceDate: { gte: startDate, lte: endDate }, status: AdvanceStatus.ACTIVE },
        include: { courier: { select: { name: true } } },
        orderBy: [{ advanceDate: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.courierPayment.findMany({
        where: {
          paymentDate: { gte: startDate, lte: endDate },
          status: CourierPaymentStatus.ACTIVE,
        },
        include: { courier: { select: { name: true } } },
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);
    return { transactions, payments, advances, courierPayments };
  }

  private async period(startDate: string, endDate: string) {
    const [shiftRows, movement] = await Promise.all([
      this.prisma.shift.findMany({
        where: { ...APPROVED, date: { gte: startDate, lte: endDate } },
        include: reportShiftInclude,
        orderBy: [{ date: 'asc' }, { approvedStartTime: 'asc' }],
      }),
      this.movements(startDate, endDate),
    ]);
    const shifts = shiftRows.map((shift) => this.shiftItem(shift));
    const totalWorkHours = shifts.reduce((sum, item) => sum + item.workHours, 0);
    const restaurantServiceAmount = shifts.reduce((sum, item) => sum + item.restaurantServiceAmount, 0);
    const courierEarnings = shifts.reduce((sum, item) => sum + item.courierEarning, 0);
    const manualIncome = movement.transactions
      .filter((item) => item.type === FinanceTransactionType.INCOME)
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const manualExpense = movement.transactions
      .filter((item) => item.type === FinanceTransactionType.EXPENSE)
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const restaurantCollections = movement.payments.reduce((sum, item) => sum + Number(item.amount), 0);
    const courierAdvances = movement.advances.reduce((sum, item) => sum + Number(item.amount), 0);
    const courierPayments = movement.courierPayments.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );
    const grossDifference = restaurantServiceAmount - courierEarnings;
    return {
      summary: {
        approvedShiftCount: shifts.length,
        totalWorkHours: round2(totalWorkHours),
        restaurantServiceAmount: round2(restaurantServiceAmount),
        courierEarnings: round2(courierEarnings),
        grossDifference: round2(grossDifference),
        manualIncome: round2(manualIncome),
        manualExpense: round2(manualExpense),
        operationalNetProfit: round2(grossDifference + manualIncome - manualExpense),
        restaurantCollections: round2(restaurantCollections),
        courierAdvances: round2(courierAdvances),
        courierPayments: round2(courierPayments),
        cashMovement: round2(
          restaurantCollections + manualIncome - courierAdvances - courierPayments - manualExpense,
        ),
      },
      shifts,
      transactions: movement.transactions.map((item) => ({ ...item, amount: item.amount.toString() })),
      payments: movement.payments.map((item) => ({
        id: item.id, paymentDate: item.paymentDate, restaurantName: item.restaurant.name,
        amount: item.amount.toString(), method: item.method, note: item.note,
      })),
      advances: movement.advances.map((item) => ({
        id: item.id, advanceDate: item.advanceDate, courierName: item.courier.name,
        amount: item.amount.toString(), note: item.note,
      })),
      courierPayments: movement.courierPayments.map((item) => ({
        id: item.id,
        paymentDate: item.paymentDate,
        courierName: item.courier.name,
        amount: item.amount.toString(),
        method: item.method,
        note: item.note,
      })),
    };
  }

  private groupShifts(shifts: ReturnType<ReportsService['shiftItem']>[], key: 'restaurant' | 'courier') {
    const map = new Map<string, { id: string; name: string; shiftCount: number; workHours: number; amount: number }>();
    for (const shift of shifts) {
      if (key === 'restaurant') {
        // Segment-aware: a shift split across restaurants contributes to each
        // restaurant it touched, using that restaurant's own hours and amount.
        for (const r of shift.restaurants) {
          const current = map.get(r.restaurantId) ?? {
            id: r.restaurantId,
            name: r.restaurantName ?? shift.restaurantName,
            shiftCount: 0,
            workHours: 0,
            amount: 0,
          };
          current.shiftCount += 1;
          current.workHours += r.hours;
          current.amount += r.amount;
          map.set(r.restaurantId, current);
        }
        continue;
      }
      const current = map.get(shift.courierId) ?? {
        id: shift.courierId,
        name: shift.courierName,
        shiftCount: 0,
        workHours: 0,
        amount: 0,
      };
      current.shiftCount += 1;
      current.workHours += shift.workHours;
      current.amount += shift.courierEarning;
      map.set(shift.courierId, current);
    }
    return [...map.values()].map((item) => ({ ...item, workHours: round2(item.workHours), amount: round2(item.amount) }));
  }

  async daily(date: string) {
    const report = await this.period(date, date);
    return {
      date,
      ...report,
      restaurantBreakdown: this.groupShifts(report.shifts, 'restaurant'),
      courierBreakdown: this.groupShifts(report.shifts, 'courier'),
    };
  }

  async range(startDate: string, endDate: string) {
    const report = await this.period(startDate, endDate);
    const dayMap = new Map<string, typeof report.summary>();
    const cursor = new Date(`${startDate}T00:00:00Z`);
    const last = new Date(`${endDate}T00:00:00Z`);
    while (cursor <= last) {
      const date = cursor.toISOString().slice(0, 10);
      dayMap.set(date, {
        approvedShiftCount: 0, totalWorkHours: 0, restaurantServiceAmount: 0,
        courierEarnings: 0, grossDifference: 0, manualIncome: 0, manualExpense: 0,
        operationalNetProfit: 0, restaurantCollections: 0, courierAdvances: 0,
        courierPayments: 0, cashMovement: 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const add = (date: string, field: keyof typeof report.summary, value: number) => {
      const day = dayMap.get(date)!;
      (day[field] as number) = round2((day[field] as number) + value);
    };
    for (const shift of report.shifts) {
      add(shift.date, 'approvedShiftCount', 1); add(shift.date, 'totalWorkHours', shift.workHours);
      add(shift.date, 'restaurantServiceAmount', shift.restaurantServiceAmount);
      add(shift.date, 'courierEarnings', shift.courierEarning); add(shift.date, 'grossDifference', shift.grossDifference);
    }
    for (const item of report.transactions) add(item.transactionDate, item.type === FinanceTransactionType.INCOME ? 'manualIncome' : 'manualExpense', Number(item.amount));
    for (const item of report.payments) add(item.paymentDate, 'restaurantCollections', Number(item.amount));
    for (const item of report.advances) add(item.advanceDate, 'courierAdvances', Number(item.amount));
    for (const item of report.courierPayments) {
      add(item.paymentDate, 'courierPayments', Number(item.amount));
    }
    for (const day of dayMap.values()) {
      day.operationalNetProfit = round2(day.grossDifference + day.manualIncome - day.manualExpense);
      day.cashMovement = round2(
        day.restaurantCollections + day.manualIncome - day.courierAdvances -
          day.courierPayments - day.manualExpense,
      );
    }
    return {
      startDate, endDate, summary: report.summary,
      dailyBreakdown: [...dayMap.entries()].reverse().map(([date, values]) => ({ date, ...values })),
      restaurantBreakdown: this.groupShifts(report.shifts, 'restaurant'),
      courierBreakdown: this.groupShifts(report.shifts, 'courier'),
      // Per-shift detail so the period report can show everything (incl. switches).
      shifts: report.shifts,
    };
  }

  async restaurantReport(startDate: string, endDate: string) {
    const [restaurants, shifts] = await Promise.all([
      this.prisma.restaurant.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        include: {
          invoices: { where: { invoiceDate: { gte: startDate, lte: endDate }, status: { not: InvoiceStatus.CANCELLED } } },
          payments: { where: { paymentDate: { gte: startDate, lte: endDate }, status: PaymentStatus.ACTIVE }, orderBy: { paymentDate: 'desc' } },
        },
      }),
      this.prisma.shift.findMany({
        where: { ...APPROVED, date: { gte: startDate, lte: endDate } },
        include: reportShiftInclude,
      }),
    ]);

    // Segment-aware work hours / service amount per restaurant.
    const byRestaurant = new Map<string, { hours: number; amount: number; shiftCount: number }>();
    for (const shift of shifts) {
      for (const r of restaurantRevenueBreakdown(shift)) {
        const current = byRestaurant.get(r.restaurantId) ?? { hours: 0, amount: 0, shiftCount: 0 };
        current.hours += r.hours;
        current.amount += r.amount;
        current.shiftCount += 1;
        byRestaurant.set(r.restaurantId, current);
      }
    }

    return restaurants.map((restaurant) => {
      const work = byRestaurant.get(restaurant.id) ?? { hours: 0, amount: 0, shiftCount: 0 };
      const invoiced = restaurant.invoices.reduce((sum, item) => sum + Number(item.amount), 0);
      const paid = restaurant.payments.reduce((sum, item) => sum + Number(item.amount), 0);
      return {
        restaurantId: restaurant.id, restaurantName: restaurant.name, isActive: restaurant.isActive,
        shiftCount: work.shiftCount, workHours: round2(work.hours), serviceAmount: round2(work.amount),
        invoiced: round2(invoiced), paid: round2(paid),
        // Debt is what the restaurant owes for services rendered minus what it
        // paid. Invoices are informational only and no longer drive the balance.
        remainingBalance: round2(work.amount - paid),
        lastPaymentDate: restaurant.payments[0]?.paymentDate ?? null,
      };
    });
  }

  async courierReport(startDate: string, endDate: string) {
    const couriers = await this.prisma.courier.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        shifts: { where: { ...APPROVED, date: { gte: startDate, lte: endDate } } },
        advances: { where: { advanceDate: { gte: startDate, lte: endDate }, status: AdvanceStatus.ACTIVE }, orderBy: { advanceDate: 'desc' } },
        payments: {
          where: {
            paymentDate: { gte: startDate, lte: endDate },
            status: CourierPaymentStatus.ACTIVE,
          },
          orderBy: { paymentDate: 'desc' },
        },
        // Stock sold to the courier within the period is charged against earnings.
        accessorySales: { where: { saleDate: { gte: startDate, lte: endDate } } },
        motorcycleSales: {
          where: { status: 'SOLD', salePrice: { not: null }, saleDate: { gte: startDate, lte: endDate } },
        },
      },
    });
    return couriers.map((courier) => {
      const workHours = courier.shifts.reduce((sum, shift) => sum + durationHours(shift.approvedStartTime!, shift.approvedEndTime!), 0);
      const earnings = courier.shifts.reduce((sum, shift) => sum + durationHours(shift.approvedStartTime!, shift.approvedEndTime!) * Number(shift.courierHourlyRateSnapshot), 0);
      const advances = courier.advances.reduce((sum, item) => sum + Number(item.amount), 0);
      const payments = courier.payments.reduce((sum, item) => sum + Number(item.amount), 0);
      const productCharges =
        courier.accessorySales.reduce((sum, s) => sum + Number(s.unitPrice) * s.quantity, 0) +
        courier.motorcycleSales.reduce((sum, m) => sum + Number(m.salePrice), 0);
      return {
        courierId: courier.id, courierName: courier.name, isActive: courier.isActive,
        shiftCount: courier.shifts.length, workHours: round2(workHours), earnings: round2(earnings),
        advances: round2(advances), payments: round2(payments),
        productCharges: round2(productCharges),
        remainingPayable: round2(earnings - advances - payments - productCharges),
        lastAdvanceDate: courier.advances[0]?.advanceDate ?? null,
        lastPaymentDate: courier.payments[0]?.paymentDate ?? null,
      };
    });
  }

  async dashboard() {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
    const start = new Date(`${today}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - 6);
    const last7Start = start.toISOString().slice(0, 10);
    const [todayReport, last7Days, restaurantAccounts, courierAccounts, activeRestaurants, activeCouriers, pendingShiftCount] = await Promise.all([
      this.daily(today), this.range(last7Start, today), this.restaurantReport('0000-01-01', '9999-12-31'),
      this.courierReport('0000-01-01', '9999-12-31'),
      this.prisma.restaurant.count({ where: { isActive: true } }), this.prisma.courier.count({ where: { isActive: true } }),
      this.prisma.shift.count({
        where: {
          status: { not: ShiftStatus.CANCELLED },
          confirmationStatus: { not: ShiftConfirmationStatus.ADMIN_APPROVED },
        },
      }),
    ]);
    return {
      date: today, ...todayReport.summary,
      totalOpenRestaurantBalance: round2(restaurantAccounts.reduce((sum, item) => sum + Math.max(0, item.remainingBalance), 0)),
      totalCourierRemainingPayable: round2(courierAccounts.reduce((sum, item) => sum + Math.max(0, item.remainingPayable), 0)),
      activeRestaurantCount: activeRestaurants, activeCourierCount: activeCouriers, pendingShiftCount,
      last7Days: last7Days.dailyBreakdown,
      restaurantDistribution: todayReport.restaurantBreakdown,
      courierDistribution: todayReport.courierBreakdown,
      // Simple per-courier / per-restaurant summaries for the overview tables.
      couriers: courierAccounts.map((c) => ({
        courierId: c.courierId,
        courierName: c.courierName,
        workHours: c.workHours,
        earnings: c.earnings,
        remainingPayable: c.remainingPayable,
      })),
      restaurants: restaurantAccounts.map((r) => ({
        restaurantId: r.restaurantId,
        restaurantName: r.restaurantName,
        serviceAmount: r.serviceAmount,
        paid: r.paid,
        remainingBalance: r.remainingBalance,
      })),
    };
  }
}
