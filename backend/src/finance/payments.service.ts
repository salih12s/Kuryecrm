import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from './invoices.service';
import { CreatePaymentDto, UpdatePaymentDto, PaymentQueryDto } from './dto/payment.dto';

const include = {
  restaurant: { select: { id: true, name: true } },
  invoice: { select: { id: true, invoiceNo: true } },
} satisfies Prisma.RestaurantPaymentInclude;
type PaymentRow = Prisma.RestaurantPaymentGetPayload<{ include: typeof include }>;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoices: InvoicesService,
  ) {}

  private serialize(p: PaymentRow) {
    return {
      id: p.id,
      restaurantId: p.restaurantId,
      restaurantName: p.restaurant.name,
      invoiceId: p.invoiceId,
      invoiceNo: p.invoice?.invoiceNo ?? null,
      paymentDate: p.paymentDate,
      amount: p.amount.toString(),
      method: p.method,
      note: p.note,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private buildWhere(q: PaymentQueryDto): Prisma.RestaurantPaymentWhereInput {
    const where: Prisma.RestaurantPaymentWhereInput = {};
    if (q.restaurantId) where.restaurantId = q.restaurantId;
    if (q.status) where.status = q.status;
    if (q.dateFrom || q.dateTo) {
      where.paymentDate = {};
      if (q.dateFrom) (where.paymentDate as Prisma.StringFilter).gte = q.dateFrom;
      if (q.dateTo) (where.paymentDate as Prisma.StringFilter).lte = q.dateTo;
    }
    return where;
  }

  /** Ensures the invoice (if given) exists and belongs to the same restaurant. */
  private async resolveInvoiceId(restaurantId: string, invoiceId?: string): Promise<string | null> {
    if (!invoiceId) return null;
    const invoice = await this.prisma.restaurantInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Fatura bulunamadı.');
    if (invoice.restaurantId !== restaurantId) {
      throw new BadRequestException('Fatura, seçilen restorana ait değil.');
    }
    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('İptal edilmiş faturaya ödeme bağlanamaz.');
    }
    return invoiceId;
  }

  async findAll(q: PaymentQueryDto) {
    const rows = await this.prisma.restaurantPayment.findMany({
      where: this.buildWhere(q),
      include,
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async findOne(id: string) {
    const row = await this.prisma.restaurantPayment.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException('Ödeme bulunamadı.');
    return this.serialize(row);
  }

  async create(dto: CreatePaymentDto) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: dto.restaurantId } });
    if (!restaurant) throw new NotFoundException('Restoran bulunamadı.');
    const invoiceId = await this.resolveInvoiceId(dto.restaurantId, dto.invoiceId);

    const row = await this.prisma.restaurantPayment.create({
      data: {
        restaurantId: dto.restaurantId,
        invoiceId,
        paymentDate: dto.paymentDate,
        amount: new Prisma.Decimal(dto.amount),
        method: dto.method || null,
        note: dto.note || null,
      },
      include,
    });
    if (invoiceId) await this.invoices.recomputeStatus(invoiceId);
    return this.serialize(row);
  }

  async update(id: string, dto: UpdatePaymentDto) {
    const existing = await this.prisma.restaurantPayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ödeme bulunamadı.');

    const data: Prisma.RestaurantPaymentUpdateInput = {};
    let newInvoiceId = existing.invoiceId;

    if (dto.invoiceId !== undefined) {
      newInvoiceId = dto.invoiceId
        ? await this.resolveInvoiceId(existing.restaurantId, dto.invoiceId)
        : null;
      data.invoice = newInvoiceId ? { connect: { id: newInvoiceId } } : { disconnect: true };
    }
    if (dto.paymentDate) data.paymentDate = dto.paymentDate;
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.method !== undefined) data.method = dto.method || null;
    if (dto.note !== undefined) data.note = dto.note || null;

    const row = await this.prisma.restaurantPayment.update({ where: { id }, data, include });

    // Recompute both the old and the new invoice when amount/link changes.
    const affected = new Set([existing.invoiceId, newInvoiceId].filter(Boolean) as string[]);
    for (const invId of affected) await this.invoices.recomputeStatus(invId);

    return this.serialize(row);
  }

  async setStatus(id: string, status: PaymentStatus) {
    const existing = await this.prisma.restaurantPayment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ödeme bulunamadı.');

    const row = await this.prisma.restaurantPayment.update({ where: { id }, data: { status }, include });
    if (existing.invoiceId) await this.invoices.recomputeStatus(existing.invoiceId);
    return this.serialize(row);
  }
}
