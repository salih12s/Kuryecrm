import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from './dto/invoice.dto';

const include = {
  restaurant: { select: { id: true, name: true } },
} satisfies Prisma.RestaurantInvoiceInclude;
type InvoiceRow = Prisma.RestaurantInvoiceGetPayload<{ include: typeof include }>;

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(i: InvoiceRow & { paidAmount?: number }) {
    return {
      id: i.id,
      restaurantId: i.restaurantId,
      restaurantName: i.restaurant.name,
      invoiceNo: i.invoiceNo,
      invoiceDate: i.invoiceDate,
      periodStart: i.periodStart,
      periodEnd: i.periodEnd,
      amount: i.amount.toString(),
      note: i.note,
      status: i.status,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    };
  }

  private validatePeriod(start?: string | null, end?: string | null) {
    if (start && end && end < start) {
      throw new BadRequestException('Dönem bitişi, dönem başlangıcından önce olamaz.');
    }
  }

  private buildWhere(q: InvoiceQueryDto): Prisma.RestaurantInvoiceWhereInput {
    const where: Prisma.RestaurantInvoiceWhereInput = {};
    if (q.restaurantId) where.restaurantId = q.restaurantId;
    if (q.status) where.status = q.status;
    if (q.dateFrom || q.dateTo) {
      where.invoiceDate = {};
      if (q.dateFrom) (where.invoiceDate as Prisma.StringFilter).gte = q.dateFrom;
      if (q.dateTo) (where.invoiceDate as Prisma.StringFilter).lte = q.dateTo;
    }
    return where;
  }

  async findAll(q: InvoiceQueryDto) {
    const rows = await this.prisma.restaurantInvoice.findMany({
      where: this.buildWhere(q),
      include,
      orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async findOne(id: string) {
    const row = await this.prisma.restaurantInvoice.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException('Fatura bulunamadı.');
    return this.serialize(row);
  }

  async create(dto: CreateInvoiceDto) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: dto.restaurantId } });
    if (!restaurant) throw new NotFoundException('Restoran bulunamadı.');
    this.validatePeriod(dto.periodStart, dto.periodEnd);

    const row = await this.prisma.restaurantInvoice.create({
      data: {
        restaurantId: dto.restaurantId,
        invoiceNo: dto.invoiceNo || null,
        invoiceDate: dto.invoiceDate,
        periodStart: dto.periodStart || null,
        periodEnd: dto.periodEnd || null,
        amount: new Prisma.Decimal(dto.amount),
        note: dto.note || null,
        // New invoice with no payments is UNPAID.
        status: InvoiceStatus.UNPAID,
      },
      include,
    });
    return this.serialize(row);
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const existing = await this.prisma.restaurantInvoice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Fatura bulunamadı.');

    const start = dto.periodStart !== undefined ? dto.periodStart : existing.periodStart;
    const end = dto.periodEnd !== undefined ? dto.periodEnd : existing.periodEnd;
    this.validatePeriod(start, end);

    const data: Prisma.RestaurantInvoiceUpdateInput = {};
    if (dto.invoiceNo !== undefined) data.invoiceNo = dto.invoiceNo || null;
    if (dto.invoiceDate) data.invoiceDate = dto.invoiceDate;
    if (dto.periodStart !== undefined) data.periodStart = dto.periodStart || null;
    if (dto.periodEnd !== undefined) data.periodEnd = dto.periodEnd || null;
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.note !== undefined) data.note = dto.note || null;

    await this.prisma.restaurantInvoice.update({ where: { id }, data });
    // Amount may have changed → re-evaluate paid/partial/paid.
    await this.recomputeStatus(id);
    return this.findOne(id);
  }

  async setStatus(id: string, status: InvoiceStatus) {
    const existing = await this.prisma.restaurantInvoice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Fatura bulunamadı.');

    if (status === InvoiceStatus.CANCELLED) {
      await this.prisma.restaurantInvoice.update({ where: { id }, data: { status } });
    } else {
      // Re-activating: derive the correct paid state from payments.
      await this.prisma.restaurantInvoice.update({ where: { id }, data: { status } });
      await this.recomputeStatus(id);
    }
    return this.findOne(id);
  }

  /**
   * Recomputes UNPAID/PARTIAL/PAID from active payments for the invoice.
   * Leaves a CANCELLED invoice untouched. Called after invoice amount or
   * payment changes. Shared with PaymentsService.
   */
  async recomputeStatus(invoiceId: string) {
    const invoice = await this.prisma.restaurantInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || invoice.status === InvoiceStatus.CANCELLED) return;

    const agg = await this.prisma.restaurantPayment.aggregate({
      where: { invoiceId, status: PaymentStatus.ACTIVE },
      _sum: { amount: true },
    });
    const paid = Number(agg._sum.amount ?? 0);
    const amount = Number(invoice.amount);

    let status: InvoiceStatus;
    if (paid <= 0) status = InvoiceStatus.UNPAID;
    else if (paid < amount) status = InvoiceStatus.PARTIAL;
    else status = InvoiceStatus.PAID;

    if (status !== invoice.status) {
      await this.prisma.restaurantInvoice.update({ where: { id: invoiceId }, data: { status } });
    }
  }
}
