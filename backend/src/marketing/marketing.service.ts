import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VisitResult } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitDto, UpdateVisitDto, VisitQueryDto } from './dto/visit.dto';

const include = { user: { select: { id: true, name: true } } } satisfies Prisma.MarketingVisitInclude;
type VisitRow = Prisma.MarketingVisitGetPayload<{ include: typeof include }>;

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(v: VisitRow) {
    return {
      id: v.id,
      userId: v.userId,
      marketerName: v.user.name,
      visitDate: v.visitDate,
      placeName: v.placeName,
      contactName: v.contactName,
      phone: v.phone,
      result: v.result,
      operationSize: v.operationSize,
      negativeReason: v.negativeReason,
      note: v.note,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    };
  }

  // Sonuç POSITIVE ise operationSize, NEGATIVE ise negativeReason zorunludur.
  private assertResultFields(result: VisitResult, operationSize?: number | null, negativeReason?: string | null) {
    if (result === VisitResult.POSITIVE && !operationSize) {
      throw new BadRequestException('Olumlu sonuçlarda kaç kişilik operasyon olduğu girilmelidir.');
    }
    if (result === VisitResult.NEGATIVE && !negativeReason?.trim()) {
      throw new BadRequestException('Olumsuz sonuçlarda neden belirtilmelidir.');
    }
  }

  private buildWhere(q: VisitQueryDto, userId?: string): Prisma.MarketingVisitWhereInput {
    const where: Prisma.MarketingVisitWhereInput = {};
    if (userId) where.userId = userId;
    else if (q.userId) where.userId = q.userId;
    if (q.result) where.result = q.result;
    if (q.dateFrom || q.dateTo) {
      where.visitDate = {};
      if (q.dateFrom) (where.visitDate as Prisma.StringFilter).gte = q.dateFrom;
      if (q.dateTo) (where.visitDate as Prisma.StringFilter).lte = q.dateTo;
    }
    return where;
  }

  /** userId set = scoped to that marketer only (self-service); undefined = admin/gözlemci sees all. */
  async findAll(q: VisitQueryDto, userId?: string) {
    const rows = await this.prisma.marketingVisit.findMany({
      where: this.buildWhere(q, userId),
      include,
      orderBy: [{ visitDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async findOne(id: string, userId?: string) {
    const row = await this.ensure(id, userId);
    return this.serialize(row);
  }

  async create(dto: CreateVisitDto, userId: string) {
    this.assertResultFields(dto.result, dto.operationSize, dto.negativeReason);
    const row = await this.prisma.marketingVisit.create({
      data: {
        userId,
        visitDate: dto.visitDate,
        placeName: dto.placeName.trim(),
        contactName: dto.contactName?.trim() || null,
        phone: dto.phone?.trim() || null,
        result: dto.result,
        operationSize: dto.result === VisitResult.POSITIVE ? dto.operationSize! : null,
        negativeReason: dto.result === VisitResult.NEGATIVE ? dto.negativeReason!.trim() : null,
        note: dto.note?.trim() || null,
      },
      include,
    });
    return this.serialize(row);
  }

  async update(id: string, dto: UpdateVisitDto, userId?: string) {
    const existing = await this.ensure(id, userId);
    const result = dto.result ?? existing.result;
    const operationSize = dto.operationSize ?? existing.operationSize;
    const negativeReason = dto.negativeReason ?? existing.negativeReason;
    this.assertResultFields(result, operationSize, negativeReason);

    const data: Prisma.MarketingVisitUpdateInput = {};
    if (dto.visitDate) data.visitDate = dto.visitDate;
    if (dto.placeName) data.placeName = dto.placeName.trim();
    if (dto.contactName !== undefined) data.contactName = dto.contactName?.trim() || null;
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.note !== undefined) data.note = dto.note?.trim() || null;
    if (dto.result) data.result = dto.result;
    data.operationSize = result === VisitResult.POSITIVE ? operationSize : null;
    data.negativeReason = result === VisitResult.NEGATIVE ? (negativeReason ?? null) : null;

    const row = await this.prisma.marketingVisit.update({ where: { id }, data, include });
    return this.serialize(row);
  }

  async remove(id: string, userId?: string) {
    await this.ensure(id, userId);
    await this.prisma.marketingVisit.delete({ where: { id } });
    return { ok: true };
  }

  /** userId set = the caller must own the row (PAZARLAMACI self-service). */
  private async ensure(id: string, userId?: string) {
    const row = await this.prisma.marketingVisit.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException('Görüşme kaydı bulunamadı.');
    if (userId && row.userId !== userId) {
      throw new ForbiddenException('Bu kayıt size ait değil.');
    }
    return row;
  }
}
