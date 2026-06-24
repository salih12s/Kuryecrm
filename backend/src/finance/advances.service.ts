import { Injectable, NotFoundException } from '@nestjs/common';
import { AdvanceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdvanceDto, UpdateAdvanceDto, AdvanceQueryDto } from './dto/advance.dto';

const include = { courier: { select: { id: true, name: true } } } satisfies Prisma.CourierAdvanceInclude;
type AdvanceRow = Prisma.CourierAdvanceGetPayload<{ include: typeof include }>;

@Injectable()
export class AdvancesService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(a: AdvanceRow) {
    return {
      id: a.id,
      courierId: a.courierId,
      courierName: a.courier.name,
      amount: a.amount.toString(),
      advanceDate: a.advanceDate,
      note: a.note,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }

  private buildWhere(q: AdvanceQueryDto): Prisma.CourierAdvanceWhereInput {
    const where: Prisma.CourierAdvanceWhereInput = {};
    if (q.courierId) where.courierId = q.courierId;
    if (q.status) where.status = q.status;
    if (q.dateFrom || q.dateTo) {
      where.advanceDate = {};
      if (q.dateFrom) (where.advanceDate as Prisma.StringFilter).gte = q.dateFrom;
      if (q.dateTo) (where.advanceDate as Prisma.StringFilter).lte = q.dateTo;
    }
    return where;
  }

  async findAll(q: AdvanceQueryDto) {
    const rows = await this.prisma.courierAdvance.findMany({
      where: this.buildWhere(q),
      include,
      orderBy: [{ advanceDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async findOne(id: string) {
    const row = await this.prisma.courierAdvance.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException('Avans kaydı bulunamadı.');
    return this.serialize(row);
  }

  async create(dto: CreateAdvanceDto) {
    const courier = await this.prisma.courier.findUnique({ where: { id: dto.courierId } });
    if (!courier) throw new NotFoundException('Kurye bulunamadı.');

    const row = await this.prisma.courierAdvance.create({
      data: {
        courierId: dto.courierId,
        amount: new Prisma.Decimal(dto.amount),
        advanceDate: dto.advanceDate,
        note: dto.note || null,
      },
      include,
    });
    return this.serialize(row);
  }

  async update(id: string, dto: UpdateAdvanceDto) {
    await this.ensure(id);
    const data: Prisma.CourierAdvanceUpdateInput = {};
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.advanceDate) data.advanceDate = dto.advanceDate;
    if (dto.note !== undefined) data.note = dto.note || null;

    const row = await this.prisma.courierAdvance.update({ where: { id }, data, include });
    return this.serialize(row);
  }

  async setStatus(id: string, status: AdvanceStatus) {
    await this.ensure(id);
    const row = await this.prisma.courierAdvance.update({ where: { id }, data: { status }, include });
    return this.serialize(row);
  }

  private async ensure(id: string) {
    const row = await this.prisma.courierAdvance.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Avans kaydı bulunamadı.');
  }
}
