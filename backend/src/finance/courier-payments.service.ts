import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AdvanceStatus,
  CourierPaymentStatus,
  Prisma,
  ShiftConfirmationStatus,
  ShiftStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { durationHours, round2 } from '../common/time.util';
import {
  CourierPaymentQueryDto,
  CreateCourierPaymentDto,
  UpdateCourierPaymentDto,
} from './dto/courier-payment.dto';

const include = { courier: { select: { id: true, name: true } } } satisfies Prisma.CourierPaymentInclude;
type PaymentRow = Prisma.CourierPaymentGetPayload<{ include: typeof include }>;

@Injectable()
export class CourierPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(payment: PaymentRow) {
    return {
      id: payment.id,
      courierId: payment.courierId,
      courierName: payment.courier.name,
      amount: payment.amount.toString(),
      paymentDate: payment.paymentDate,
      method: payment.method,
      note: payment.note,
      status: payment.status,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private buildWhere(query: CourierPaymentQueryDto): Prisma.CourierPaymentWhereInput {
    const where: Prisma.CourierPaymentWhereInput = {};
    if (query.courierId) where.courierId = query.courierId;
    if (query.status) where.status = query.status;
    if (query.dateFrom || query.dateTo) {
      where.paymentDate = {};
      if (query.dateFrom) (where.paymentDate as Prisma.StringFilter).gte = query.dateFrom;
      if (query.dateTo) (where.paymentDate as Prisma.StringFilter).lte = query.dateTo;
    }
    return where;
  }

  async findAll(query: CourierPaymentQueryDto) {
    const rows = await this.prisma.courierPayment.findMany({
      where: this.buildWhere(query),
      include,
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.serialize(row));
  }

  async findOne(id: string) {
    const row = await this.prisma.courierPayment.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException('Kurye ödeme kaydı bulunamadı.');
    return this.serialize(row);
  }

  async create(dto: CreateCourierPaymentDto) {
    await this.assertCourier(dto.courierId);
    await this.assertWithinRemaining(dto.courierId, dto.amount);
    const row = await this.prisma.courierPayment.create({
      data: {
        courierId: dto.courierId,
        amount: new Prisma.Decimal(dto.amount),
        paymentDate: dto.paymentDate,
        method: dto.method || null,
        note: dto.note || null,
      },
      include,
    });
    return this.serialize(row);
  }

  async update(id: string, dto: UpdateCourierPaymentDto) {
    const existing = await this.prisma.courierPayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kurye ödeme kaydı bulunamadı.');

    const nextAmount = dto.amount ?? Number(existing.amount);
    if (existing.status === CourierPaymentStatus.ACTIVE) {
      await this.assertWithinRemaining(existing.courierId, nextAmount, existing.id);
    }

    const data: Prisma.CourierPaymentUpdateInput = {};
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.paymentDate) data.paymentDate = dto.paymentDate;
    if (dto.method !== undefined) data.method = dto.method || null;
    if (dto.note !== undefined) data.note = dto.note || null;

    const row = await this.prisma.courierPayment.update({ where: { id }, data, include });
    return this.serialize(row);
  }

  async setStatus(id: string, status: CourierPaymentStatus) {
    const existing = await this.prisma.courierPayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kurye ödeme kaydı bulunamadı.');
    if (status === CourierPaymentStatus.ACTIVE && existing.status !== CourierPaymentStatus.ACTIVE) {
      await this.assertWithinRemaining(existing.courierId, Number(existing.amount), existing.id);
    }
    const row = await this.prisma.courierPayment.update({ where: { id }, data: { status }, include });
    return this.serialize(row);
  }

  private async assertCourier(courierId: string) {
    const courier = await this.prisma.courier.findUnique({ where: { id: courierId } });
    if (!courier) throw new NotFoundException('Kurye bulunamadı.');
  }

  private async assertWithinRemaining(courierId: string, amount: number, ignorePaymentId?: string) {
    const [shifts, advanceTotal, paymentTotal] = await Promise.all([
      this.prisma.shift.findMany({
        where: {
          courierId,
          status: ShiftStatus.COMPLETED,
          confirmationStatus: ShiftConfirmationStatus.ADMIN_APPROVED,
          approvedStartTime: { not: null },
          approvedEndTime: { not: null },
        },
        select: { approvedStartTime: true, approvedEndTime: true, courierHourlyRateSnapshot: true },
      }),
      this.prisma.courierAdvance.aggregate({
        where: { courierId, status: AdvanceStatus.ACTIVE },
        _sum: { amount: true },
      }),
      this.prisma.courierPayment.aggregate({
        where: {
          courierId,
          status: CourierPaymentStatus.ACTIVE,
          ...(ignorePaymentId ? { id: { not: ignorePaymentId } } : {}),
        },
        _sum: { amount: true },
      }),
    ]);

    const earnings = shifts.reduce(
      (sum, shift) =>
        sum +
        durationHours(shift.approvedStartTime as string, shift.approvedEndTime as string) *
          Number(shift.courierHourlyRateSnapshot),
      0,
    );
    const remaining = round2(
      earnings - Number(advanceTotal._sum.amount ?? 0) - Number(paymentTotal._sum.amount ?? 0),
    );
    if (amount > remaining + 0.001) {
      throw new BadRequestException(
        `Ödeme tutarı kuryenin kalan alacağını aşamaz. Kalan alacak: ${remaining.toFixed(2)} ₺`,
      );
    }
  }
}
