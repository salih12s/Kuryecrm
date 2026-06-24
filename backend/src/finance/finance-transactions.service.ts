import { Injectable, NotFoundException } from '@nestjs/common';
import { FinanceTransactionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFinanceTransactionDto,
  UpdateFinanceTransactionDto,
  FinanceTransactionQueryDto,
} from './dto/finance-transaction.dto';

@Injectable()
export class FinanceTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(t: Prisma.FinanceTransactionGetPayload<object>) {
    return {
      id: t.id,
      type: t.type,
      title: t.title,
      category: t.category,
      amount: t.amount.toString(),
      transactionDate: t.transactionDate,
      note: t.note,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  private buildWhere(q: FinanceTransactionQueryDto): Prisma.FinanceTransactionWhereInput {
    const where: Prisma.FinanceTransactionWhereInput = {};
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    if (q.category) where.category = { contains: q.category, mode: 'insensitive' };
    if (q.dateFrom || q.dateTo) {
      where.transactionDate = {};
      if (q.dateFrom) (where.transactionDate as Prisma.StringFilter).gte = q.dateFrom;
      if (q.dateTo) (where.transactionDate as Prisma.StringFilter).lte = q.dateTo;
    }
    return where;
  }

  async findAll(q: FinanceTransactionQueryDto) {
    const rows = await this.prisma.financeTransaction.findMany({
      where: this.buildWhere(q),
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async findOne(id: string) {
    const row = await this.prisma.financeTransaction.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Kayıt bulunamadı.');
    return this.serialize(row);
  }

  async create(dto: CreateFinanceTransactionDto) {
    const row = await this.prisma.financeTransaction.create({
      data: {
        type: dto.type,
        title: dto.title,
        category: dto.category || null,
        amount: new Prisma.Decimal(dto.amount),
        transactionDate: dto.transactionDate,
        note: dto.note || null,
      },
    });
    return this.serialize(row);
  }

  async update(id: string, dto: UpdateFinanceTransactionDto) {
    await this.ensure(id);
    const data: Prisma.FinanceTransactionUpdateInput = {};
    if (dto.type) data.type = dto.type;
    if (dto.title) data.title = dto.title;
    if (dto.category !== undefined) data.category = dto.category || null;
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.transactionDate) data.transactionDate = dto.transactionDate;
    if (dto.note !== undefined) data.note = dto.note || null;

    const row = await this.prisma.financeTransaction.update({ where: { id }, data });
    return this.serialize(row);
  }

  async setStatus(id: string, status: FinanceTransactionStatus) {
    await this.ensure(id);
    const row = await this.prisma.financeTransaction.update({ where: { id }, data: { status } });
    return this.serialize(row);
  }

  private async ensure(id: string) {
    const row = await this.prisma.financeTransaction.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Kayıt bulunamadı.');
  }
}
