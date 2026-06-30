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

// Sales are joined to the (optional) buyer courier so we can show the name.
const saleInclude = {
  buyerCourier: { select: { id: true, name: true } },
} satisfies Prisma.AccessorySaleInclude;
type SaleRow = Prisma.AccessorySaleGetPayload<{ include: typeof saleInclude }>;

@Injectable()
export class AccessoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Stock is tracked per product *name* within a type. A blank name is its own
  // "unnamed" bucket. Normalize so " Çanta " and "Çanta" count as one product.
  private normalizeName(name?: string | null): string {
    return (name ?? '').trim();
  }

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
  private serializeSale(s: SaleRow) {
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
      buyerCourierId: s.buyerCourierId,
      buyerCourierName: s.buyerCourier?.name ?? null,
      note: s.note,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  async listSales(q: AccessoryQueryDto) {
    const rows = await this.prisma.accessorySale.findMany({
      where: this.dateWhere(q, 'saleDate'),
      include: saleInclude,
      orderBy: [{ saleDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.serializeSale(r));
  }

  // Current stock on hand for one product (type + name) = purchased - sold for
  // that exact product. `excludeSaleId` lets an edit ignore the row being
  // changed so its own quantity isn't double-counted.
  private async onHand(type: AccessoryType, name: string | null | undefined, excludeSaleId?: string) {
    const key = this.normalizeName(name);
    const [purchases, sales] = await Promise.all([
      this.prisma.accessoryPurchase.findMany({ where: { type }, select: { name: true, quantity: true } }),
      this.prisma.accessorySale.findMany({
        where: { type, ...(excludeSaleId ? { id: { not: excludeSaleId } } : {}) },
        select: { name: true, quantity: true },
      }),
    ]);
    const purchased = purchases
      .filter((p) => this.normalizeName(p.name) === key)
      .reduce((sum, p) => sum + p.quantity, 0);
    const sold = sales
      .filter((s) => this.normalizeName(s.name) === key)
      .reduce((sum, s) => sum + s.quantity, 0);
    return purchased - sold;
  }

  private async assertStock(
    type: AccessoryType,
    name: string | null | undefined,
    quantity: number,
    excludeSaleId?: string,
  ) {
    const available = await this.onHand(type, name, excludeSaleId);
    if (quantity > available) {
      const label = this.normalizeName(name) || 'bu ürün';
      throw new BadRequestException(
        `Yetersiz stok. "${label}" için stokta ${available} adet var, ${quantity} adet satılamaz.`,
      );
    }
  }

  // The buyer courier (if any) must exist before we link the sale to it.
  private async resolveBuyerCourier(buyerCourierId?: string | null): Promise<string | null> {
    if (!buyerCourierId) return null;
    const courier = await this.prisma.courier.findUnique({ where: { id: buyerCourierId } });
    if (!courier) throw new NotFoundException('Alıcı kurye bulunamadı.');
    return courier.id;
  }

  async createSale(dto: CreateAccessorySaleDto) {
    // Sale must pull from existing stock of that product; reject if negative.
    await this.assertStock(dto.type, dto.name, dto.quantity);
    const buyerCourierId = await this.resolveBuyerCourier(dto.buyerCourierId);
    const row = await this.prisma.accessorySale.create({
      data: {
        type: dto.type,
        name: dto.name || null,
        quantity: dto.quantity,
        unitPrice: new Prisma.Decimal(dto.unitPrice),
        unitCost: new Prisma.Decimal(dto.unitCost),
        saleDate: dto.saleDate,
        buyer: dto.buyer || null,
        buyerCourierId,
        note: dto.note || null,
      },
      include: saleInclude,
    });
    return this.serializeSale(row);
  }

  async updateSale(id: string, dto: UpdateAccessorySaleDto) {
    const existing = await this.prisma.accessorySale.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Satış kaydı bulunamadı.');
    // Re-validate stock against the new product (type+name)/quantity, ignoring
    // this row itself.
    const nextType = dto.type ?? existing.type;
    const nextName = dto.name !== undefined ? dto.name : existing.name;
    const nextQty = dto.quantity ?? existing.quantity;
    await this.assertStock(nextType, nextName, nextQty, id);
    const data: Prisma.AccessorySaleUpdateInput = {};
    if (dto.type) data.type = dto.type;
    if (dto.name !== undefined) data.name = dto.name || null;
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.unitPrice !== undefined) data.unitPrice = new Prisma.Decimal(dto.unitPrice);
    if (dto.unitCost !== undefined) data.unitCost = new Prisma.Decimal(dto.unitCost);
    if (dto.saleDate) data.saleDate = dto.saleDate;
    if (dto.buyer !== undefined) data.buyer = dto.buyer || null;
    if (dto.buyerCourierId !== undefined) {
      data.buyerCourier = dto.buyerCourierId
        ? { connect: { id: await this.resolveBuyerCourier(dto.buyerCourierId) as string } }
        : { disconnect: true };
    }
    if (dto.note !== undefined) data.note = dto.note || null;
    const row = await this.prisma.accessorySale.update({ where: { id }, data, include: saleInclude });
    return this.serializeSale(row);
  }

  // Distinct named products (type + name) with current stock on hand, for the
  // sale form's autocomplete. Sorted by name; `lastUnitCost` is the most recent
  // purchase cost so the form can prefill the cost basis.
  async products() {
    const [purchases, sales] = await Promise.all([
      this.prisma.accessoryPurchase.findMany({
        orderBy: [{ purchaseDate: 'asc' }, { createdAt: 'asc' }],
        select: { type: true, name: true, quantity: true, unitCost: true },
      }),
      this.prisma.accessorySale.findMany({ select: { type: true, name: true, quantity: true } }),
    ]);
    type Entry = { type: AccessoryType; name: string; purchased: number; sold: number; lastUnitCost: string };
    const map = new Map<string, Entry>();
    for (const p of purchases) {
      const name = this.normalizeName(p.name);
      if (!name) continue; // only named products are suggestable
      const k = `${p.type}::${name}`;
      const e = map.get(k) ?? { type: p.type, name, purchased: 0, sold: 0, lastUnitCost: p.unitCost.toString() };
      e.purchased += p.quantity;
      e.lastUnitCost = p.unitCost.toString(); // asc order => last assignment is newest
      map.set(k, e);
    }
    for (const s of sales) {
      const name = this.normalizeName(s.name);
      const e = map.get(`${s.type}::${name}`);
      if (e) e.sold += s.quantity;
    }
    return [...map.values()]
      .map((e) => ({ type: e.type, name: e.name, onHandQty: e.purchased - e.sold, lastUnitCost: e.lastUnitCost }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
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
