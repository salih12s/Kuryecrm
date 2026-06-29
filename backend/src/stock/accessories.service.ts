import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessoryType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AccessoryQueryDto,
  CreateAccessoryPurchaseDto,
  CreateAccessorySaleDto,
  UpdateAccessoryPurchaseDto,
  UpdateAccessorySaleDto,
} from './dto/accessory.dto';

const ACCESSORY_TYPES: AccessoryType[] = [
  AccessoryType.BAG,
  AccessoryType.CHEST_BAG,
  AccessoryType.OTHER,
];

@Injectable()
export class AccessoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Purchases ----------------
  private serializePurchase(p: Prisma.AccessoryPurchaseGetPayload<object>) {
    return {
      id: p.id,
      type: p.type,
      name: p.name,
      quantity: p.quantity,
      unitCost: p.unitCost.toString(),
      totalCost: (Number(p.unitCost) * p.quantity).toFixed(2),
      purchaseDate: p.purchaseDate,
      supplier: p.supplier,
      note: p.note,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private dateWhere(q: AccessoryQueryDto, field: 'purchaseDate' | 'saleDate') {
    const where: Prisma.AccessoryPurchaseWhereInput & Prisma.AccessorySaleWhereInput = {};
    if (q.type) where.type = q.type;
    if (q.dateFrom || q.dateTo) {
      const range: Prisma.StringFilter = {};
      if (q.dateFrom) range.gte = q.dateFrom;
      if (q.dateTo) range.lte = q.dateTo;
      (where as Record<string, unknown>)[field] = range;
    }
    return where;
  }

  async listPurchases(q: AccessoryQueryDto) {
    const rows = await this.prisma.accessoryPurchase.findMany({
      where: this.dateWhere(q, 'purchaseDate'),
      orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.serializePurchase(r));
  }

  async createPurchase(dto: CreateAccessoryPurchaseDto) {
    const row = await this.prisma.accessoryPurchase.create({
      data: {
        type: dto.type,
        name: dto.name || null,
        quantity: dto.quantity,
        unitCost: new Prisma.Decimal(dto.unitCost),
        purchaseDate: dto.purchaseDate,
        supplier: dto.supplier || null,
        note: dto.note || null,
      },
    });
    return this.serializePurchase(row);
  }

  async updatePurchase(id: string, dto: UpdateAccessoryPurchaseDto) {
    await this.ensurePurchase(id);
    const data: Prisma.AccessoryPurchaseUpdateInput = {};
    if (dto.type) data.type = dto.type;
    if (dto.name !== undefined) data.name = dto.name || null;
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.unitCost !== undefined) data.unitCost = new Prisma.Decimal(dto.unitCost);
    if (dto.purchaseDate) data.purchaseDate = dto.purchaseDate;
    if (dto.supplier !== undefined) data.supplier = dto.supplier || null;
    if (dto.note !== undefined) data.note = dto.note || null;
    const row = await this.prisma.accessoryPurchase.update({ where: { id }, data });
    return this.serializePurchase(row);
  }

  async removePurchase(id: string) {
    await this.ensurePurchase(id);
    await this.prisma.accessoryPurchase.delete({ where: { id } });
    return { ok: true };
  }

  // ---------------- Sales ----------------
  private serializeSale(s: Prisma.AccessorySaleGetPayload<object>) {
    const revenue = Number(s.unitPrice) * s.quantity;
    const cost = Number(s.unitCost) * s.quantity;
    return {
      id: s.id,
      type: s.type,
      name: s.name,
      quantity: s.quantity,
      unitPrice: s.unitPrice.toString(),
      unitCost: s.unitCost.toString(),
      totalRevenue: revenue.toFixed(2),
      totalCost: cost.toFixed(2),
      profit: (revenue - cost).toFixed(2),
      saleDate: s.saleDate,
      buyer: s.buyer,
      note: s.note,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  async listSales(q: AccessoryQueryDto) {
    const rows = await this.prisma.accessorySale.findMany({
      where: this.dateWhere(q, 'saleDate'),
      orderBy: [{ saleDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.serializeSale(r));
  }

  // Current stock on hand for a type = purchased - sold. `excludeSaleId` lets an
  // edit ignore the sale row being changed so its own quantity isn't counted.
  private async onHand(type: AccessoryType, excludeSaleId?: string) {
    const [purchased, sold] = await Promise.all([
      this.prisma.accessoryPurchase.aggregate({
        where: { type },
        _sum: { quantity: true },
      }),
      this.prisma.accessorySale.aggregate({
        where: { type, ...(excludeSaleId ? { id: { not: excludeSaleId } } : {}) },
        _sum: { quantity: true },
      }),
    ]);
    return (purchased._sum.quantity ?? 0) - (sold._sum.quantity ?? 0);
  }

  private async assertStock(type: AccessoryType, quantity: number, excludeSaleId?: string) {
    const available = await this.onHand(type, excludeSaleId);
    if (quantity > available) {
      throw new BadRequestException(
        `Yetersiz stok. Bu türde stokta ${available} adet var, ${quantity} adet satılamaz.`,
      );
    }
  }

  async createSale(dto: CreateAccessorySaleDto) {
    // Sale must pull from existing stock; reject if it would go negative.
    await this.assertStock(dto.type, dto.quantity);
    const row = await this.prisma.accessorySale.create({
      data: {
        type: dto.type,
        name: dto.name || null,
        quantity: dto.quantity,
        unitPrice: new Prisma.Decimal(dto.unitPrice),
        unitCost: new Prisma.Decimal(dto.unitCost),
        saleDate: dto.saleDate,
        buyer: dto.buyer || null,
        note: dto.note || null,
      },
    });
    return this.serializeSale(row);
  }

  async updateSale(id: string, dto: UpdateAccessorySaleDto) {
    const existing = await this.prisma.accessorySale.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Satış kaydı bulunamadı.');
    // Re-validate stock against the new type/quantity, ignoring this row itself.
    const nextType = dto.type ?? existing.type;
    const nextQty = dto.quantity ?? existing.quantity;
    await this.assertStock(nextType, nextQty, id);
    const data: Prisma.AccessorySaleUpdateInput = {};
    if (dto.type) data.type = dto.type;
    if (dto.name !== undefined) data.name = dto.name || null;
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.unitPrice !== undefined) data.unitPrice = new Prisma.Decimal(dto.unitPrice);
    if (dto.unitCost !== undefined) data.unitCost = new Prisma.Decimal(dto.unitCost);
    if (dto.saleDate) data.saleDate = dto.saleDate;
    if (dto.buyer !== undefined) data.buyer = dto.buyer || null;
    if (dto.note !== undefined) data.note = dto.note || null;
    const row = await this.prisma.accessorySale.update({ where: { id }, data });
    return this.serializeSale(row);
  }

  async removeSale(id: string) {
    await this.ensureSale(id);
    await this.prisma.accessorySale.delete({ where: { id } });
    return { ok: true };
  }

  // ---------------- Summary (stock on hand + profit) ----------------
  // Stock on hand per type = all purchased units - all sold units (lifetime,
  // ignoring any date filter). Profit figures honor the optional date range so
  // the UI can show "profit this period".
  async summary(q: AccessoryQueryDto) {
    const [purchaseByType, saleByType, sales] = await Promise.all([
      this.prisma.accessoryPurchase.groupBy({
        by: ['type'],
        _sum: { quantity: true },
      }),
      this.prisma.accessorySale.groupBy({
        by: ['type'],
        _sum: { quantity: true },
      }),
      this.prisma.accessorySale.findMany({ where: this.dateWhere(q, 'saleDate') }),
    ]);

    const purchasedMap = new Map<AccessoryType, number>();
    for (const g of purchaseByType) purchasedMap.set(g.type, g._sum.quantity ?? 0);
    const soldMap = new Map<AccessoryType, number>();
    for (const g of saleByType) soldMap.set(g.type, g._sum.quantity ?? 0);

    // Profit / revenue per type within the date range.
    const revenueMap = new Map<AccessoryType, number>();
    const costMap = new Map<AccessoryType, number>();
    const soldInRangeMap = new Map<AccessoryType, number>();
    let totalRevenue = 0;
    let totalCost = 0;
    let totalSoldInRange = 0;
    for (const s of sales) {
      const revenue = Number(s.unitPrice) * s.quantity;
      const cost = Number(s.unitCost) * s.quantity;
      revenueMap.set(s.type, (revenueMap.get(s.type) ?? 0) + revenue);
      costMap.set(s.type, (costMap.get(s.type) ?? 0) + cost);
      soldInRangeMap.set(s.type, (soldInRangeMap.get(s.type) ?? 0) + s.quantity);
      totalRevenue += revenue;
      totalCost += cost;
      totalSoldInRange += s.quantity;
    }

    const byType = ACCESSORY_TYPES.map((type) => {
      const purchased = purchasedMap.get(type) ?? 0;
      const sold = soldMap.get(type) ?? 0;
      const revenue = revenueMap.get(type) ?? 0;
      const cost = costMap.get(type) ?? 0;
      return {
        type,
        purchasedQty: purchased,
        soldQty: sold,
        onHandQty: purchased - sold,
        soldQtyInRange: soldInRangeMap.get(type) ?? 0,
        revenue,
        cost,
        profit: revenue - cost,
      };
    });

    return {
      byType,
      totals: {
        revenue: totalRevenue,
        cost: totalCost,
        profit: totalRevenue - totalCost,
        soldQtyInRange: totalSoldInRange,
        onHandQty: byType.reduce((acc, t) => acc + t.onHandQty, 0),
      },
    };
  }

  private async ensurePurchase(id: string) {
    const row = await this.prisma.accessoryPurchase.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Alış kaydı bulunamadı.');
  }

  private async ensureSale(id: string) {
    const row = await this.prisma.accessorySale.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Satış kaydı bulunamadı.');
  }
}
