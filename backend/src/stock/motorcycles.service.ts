import { Injectable, NotFoundException } from '@nestjs/common';
import { MotorcycleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMotorcycleDto,
  MotorcycleQueryDto,
  UpdateMotorcycleDto,
} from './dto/motorcycle.dto';

@Injectable()
export class MotorcyclesService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(m: Prisma.MotorcycleGetPayload<object>) {
    const purchasePrice = Number(m.purchasePrice);
    const salePrice = m.salePrice == null ? null : Number(m.salePrice);
    // Sale profit is only meaningful once the bike is sold.
    const saleProfit =
      m.status === 'SOLD' && salePrice != null ? salePrice - purchasePrice : null;
    return {
      id: m.id,
      brand: m.brand,
      plate: m.plate,
      purchaseDate: m.purchaseDate,
      purchasePrice: m.purchasePrice.toString(),
      status: m.status,
      saleDate: m.saleDate,
      salePrice: m.salePrice == null ? null : m.salePrice.toString(),
      saleProfit,
      note: m.note,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }

  private buildWhere(q: MotorcycleQueryDto): Prisma.MotorcycleWhereInput {
    const where: Prisma.MotorcycleWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.search) {
      where.OR = [
        { brand: { contains: q.search, mode: 'insensitive' } },
        { plate: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async findAll(q: MotorcycleQueryDto) {
    const rows = await this.prisma.motorcycle.findMany({
      where: this.buildWhere(q),
      orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async summary() {
    const rows = await this.prisma.motorcycle.findMany();
    const counts = { IN_STOCK: 0, ASSIGNED: 0, SOLD: 0 } as Record<
      MotorcycleStatus,
      number
    >;
    let totalPurchaseValue = 0; // bikes still owned (not sold/retired)
    let totalSaleRevenue = 0;
    let totalSaleProfit = 0;
    for (const m of rows) {
      counts[m.status] += 1;
      const purchase = Number(m.purchasePrice);
      if (m.status === 'IN_STOCK' || m.status === 'ASSIGNED') {
        totalPurchaseValue += purchase;
      }
      if (m.status === 'SOLD' && m.salePrice != null) {
        totalSaleRevenue += Number(m.salePrice);
        totalSaleProfit += Number(m.salePrice) - purchase;
      }
    }
    return {
      total: rows.length,
      counts,
      totalPurchaseValue,
      totalSaleRevenue,
      totalSaleProfit,
    };
  }

  async findOne(id: string) {
    const row = await this.prisma.motorcycle.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Motor kaydı bulunamadı.');
    return this.serialize(row);
  }

  async create(dto: CreateMotorcycleDto) {
    const row = await this.prisma.motorcycle.create({
      data: {
        brand: dto.brand,
        plate: dto.plate || null,
        purchaseDate: dto.purchaseDate,
        purchasePrice: new Prisma.Decimal(dto.purchasePrice),
        status: dto.status ?? MotorcycleStatus.IN_STOCK,
        saleDate: dto.saleDate || null,
        salePrice: dto.salePrice != null ? new Prisma.Decimal(dto.salePrice) : null,
        note: dto.note || null,
      },
    });
    return this.serialize(row);
  }

  async update(id: string, dto: UpdateMotorcycleDto) {
    await this.ensure(id);
    const data: Prisma.MotorcycleUpdateInput = {};
    if (dto.brand) data.brand = dto.brand;
    if (dto.plate !== undefined) data.plate = dto.plate || null;
    if (dto.purchaseDate) data.purchaseDate = dto.purchaseDate;
    if (dto.purchasePrice !== undefined)
      data.purchasePrice = new Prisma.Decimal(dto.purchasePrice);
    if (dto.status) data.status = dto.status;
    if (dto.saleDate !== undefined) data.saleDate = dto.saleDate || null;
    if (dto.salePrice !== undefined)
      data.salePrice = dto.salePrice != null ? new Prisma.Decimal(dto.salePrice) : null;
    if (dto.note !== undefined) data.note = dto.note || null;

    const row = await this.prisma.motorcycle.update({ where: { id }, data });
    return this.serialize(row);
  }

  async remove(id: string) {
    await this.ensure(id);
    await this.prisma.motorcycle.delete({ where: { id } });
    return { ok: true };
  }

  private async ensure(id: string) {
    const row = await this.prisma.motorcycle.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Motor kaydı bulunamadı.');
  }
}
