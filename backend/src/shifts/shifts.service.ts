import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ShiftConfirmationStatus, ShiftStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  durationHours,
  lateMinutes,
  round2,
  splitNormalOvertime,
  timesDiffer,
} from '../common/time.util';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ApproveTimeDto } from './dto/approve-time.dto';
import { ReportTimeDto } from './dto/report-time.dto';
import { SwitchRestaurantDto } from './dto/switch-restaurant.dto';
import { PartyShiftQueryDto, ShiftQueryDto } from './dto/shift-query.dto';

const shiftInclude = {
  restaurant: { select: { id: true, name: true, isActive: true } },
  courier: {
    select: {
      id: true,
      name: true,
      isActive: true,
      plate: true,
      user: { select: { username: true } },
    },
  },
  segments: {
    orderBy: { sequence: 'asc' },
    include: { restaurant: { select: { id: true, name: true } } },
  },
} satisfies Prisma.ShiftInclude;

type ShiftWithRefs = Prisma.ShiftGetPayload<{ include: typeof shiftInclude }>;

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- helpers

  /**
   * Start and end must differ. End earlier than start is treated as a
   * midnight-crossover shift (e.g. 22:00-02:00), not an error.
   */
  private assertTimeOrder(start: string, end: string, label: string) {
    if (!timesDiffer(start, end)) {
      throw new BadRequestException(`${label} başlangıç ve bitiş saati aynı olamaz.`);
    }
  }

  /**
   * Recomputes confirmationStatus/status from the reported times.
   * Never downgrades an already ADMIN_APPROVED shift.
   */
  private deriveConfirmation(shift: {
    restaurantReportedStartTime: string | null;
    restaurantReportedEndTime: string | null;
    courierReportedStartTime: string | null;
    courierReportedEndTime: string | null;
    status: ShiftStatus;
    confirmationStatus: ShiftConfirmationStatus;
  }): { confirmationStatus: ShiftConfirmationStatus; status: ShiftStatus } {
    if (shift.confirmationStatus === ShiftConfirmationStatus.ADMIN_APPROVED) {
      return { confirmationStatus: shift.confirmationStatus, status: shift.status };
    }

    const rDone = !!shift.restaurantReportedStartTime && !!shift.restaurantReportedEndTime;
    const cDone = !!shift.courierReportedStartTime && !!shift.courierReportedEndTime;

    if (rDone && cDone) {
      const matched =
        shift.restaurantReportedStartTime === shift.courierReportedStartTime &&
        shift.restaurantReportedEndTime === shift.courierReportedEndTime;
      if (matched) {
        // A previously disputed shift that now matches returns to IN_PROGRESS.
        const status =
          shift.status === ShiftStatus.DISPUTED ? ShiftStatus.IN_PROGRESS : shift.status;
        return { confirmationStatus: ShiftConfirmationStatus.MATCHED, status };
      }
      return {
        confirmationStatus: ShiftConfirmationStatus.DISPUTED,
        status: ShiftStatus.DISPUTED,
      };
    }

    if (rDone) {
      return { confirmationStatus: ShiftConfirmationStatus.RESTAURANT_SUBMITTED, status: shift.status };
    }
    if (cDone) {
      return { confirmationStatus: ShiftConfirmationStatus.COURIER_SUBMITTED, status: shift.status };
    }
    return { confirmationStatus: ShiftConfirmationStatus.WAITING, status: shift.status };
  }

  /**
   * Derives late-start and normal/overtime breakdown for a shift. The "actual"
   * times are the admin-approved times when present, otherwise the courier's
   * own reported times (so the shift screen can flag lateness before approval).
   */
  private deriveTimes(shift: {
    plannedStartTime: string;
    plannedEndTime: string;
    approvedStartTime: string | null;
    approvedEndTime: string | null;
    courierReportedStartTime: string | null;
    courierReportedEndTime: string | null;
  }) {
    const actualStartTime = shift.approvedStartTime ?? shift.courierReportedStartTime ?? null;
    const actualEndTime = shift.approvedEndTime ?? shift.courierReportedEndTime ?? null;

    // Lateness reflects when the courier actually started (their own reported
    // time). Approving a clean start time for payment must not erase the late
    // flag, so the courier's report takes priority for the late calculation.
    const late = lateMinutes(shift.plannedStartTime, shift.courierReportedStartTime ?? actualStartTime);
    let normalHours: number | null = null;
    let overtimeHours: number | null = null;
    let totalHours: number | null = null;
    if (actualStartTime && actualEndTime) {
      const split = splitNormalOvertime(shift.plannedEndTime, actualStartTime, actualEndTime);
      normalHours = split.normalHours;
      overtimeHours = split.overtimeHours;
      totalHours = split.totalHours;
    }

    return {
      actualStartTime,
      actualEndTime,
      lateMinutes: late,
      isLate: late > 0,
      normalHours,
      overtimeHours,
      totalHours,
    };
  }

  private serializeSegments(shift: ShiftWithRefs) {
    return shift.segments.map((seg) => ({
      id: seg.id,
      restaurantId: seg.restaurantId,
      restaurantName: seg.restaurant.name,
      startTime: seg.startTime,
      endTime: seg.endTime,
      sequence: seg.sequence,
    }));
  }

  /** Adds a simple derived calculation (only when approved times exist). */
  private serializeAdmin(shift: ShiftWithRefs) {
    let calculation: {
      workHours: number;
      restaurantRevenue: number;
      courierCost: number;
      grossDifference: number;
    } | null = null;

    if (shift.approvedStartTime && shift.approvedEndTime) {
      const hours = durationHours(shift.approvedStartTime, shift.approvedEndTime);
      const rRate = Number(shift.restaurantHourlyRateSnapshot);
      const cRate = Number(shift.courierHourlyRateSnapshot);
      const revenue = hours * rRate;
      const cost = hours * cRate;
      calculation = {
        workHours: round2(hours),
        restaurantRevenue: round2(revenue),
        courierCost: round2(cost),
        grossDifference: round2(revenue - cost),
      };
    }

    const derived = this.deriveTimes(shift);

    return {
      id: shift.id,
      restaurantId: shift.restaurantId,
      courierId: shift.courierId,
      restaurantName: shift.restaurant.name,
      courierName: shift.courier.name,
      courierUsername: shift.courier.user?.username ?? null,
      courierPlate: shift.courier.plate,
      date: shift.date,
      plannedStartTime: shift.plannedStartTime,
      plannedEndTime: shift.plannedEndTime,
      extraStartTime: shift.extraStartTime,
      extraEndTime: shift.extraEndTime,
      restaurantHourlyRateSnapshot: shift.restaurantHourlyRateSnapshot.toString(),
      courierHourlyRateSnapshot: shift.courierHourlyRateSnapshot.toString(),
      restaurantReportedStartTime: shift.restaurantReportedStartTime,
      restaurantReportedEndTime: shift.restaurantReportedEndTime,
      courierReportedStartTime: shift.courierReportedStartTime,
      courierReportedEndTime: shift.courierReportedEndTime,
      approvedStartTime: shift.approvedStartTime,
      approvedEndTime: shift.approvedEndTime,
      ...derived,
      segments: this.serializeSegments(shift),
      status: shift.status,
      confirmationStatus: shift.confirmationStatus,
      note: shift.note,
      adminNote: shift.adminNote,
      calculation,
      createdAt: shift.createdAt,
      updatedAt: shift.updatedAt,
    };
  }

  /** Party responses intentionally omit all counterparty rates and profit data. */
  private serializeParty(shift: ShiftWithRefs, perspective: 'restaurant' | 'courier') {
    const {
      restaurantHourlyRateSnapshot: _restaurantRate,
      courierHourlyRateSnapshot: _courierRate,
      calculation: _calculation,
      adminNote: _adminNote,
      restaurantReportedStartTime,
      restaurantReportedEndTime,
      courierReportedStartTime,
      courierReportedEndTime,
      ...safe
    } = this.serializeAdmin(shift);

    return perspective === 'restaurant'
      ? { ...safe, restaurantReportedStartTime, restaurantReportedEndTime }
      : { ...safe, courierReportedStartTime, courierReportedEndTime };
  }

  private buildWhere(
    query: ShiftQueryDto | PartyShiftQueryDto,
    base: Prisma.ShiftWhereInput = {},
  ): Prisma.ShiftWhereInput {
    const where: Prisma.ShiftWhereInput = {};
    if ('restaurantId' in query && query.restaurantId) where.restaurantId = query.restaurantId;
    if ('courierId' in query && query.courierId) where.courierId = query.courierId;
    if (query.status) where.status = query.status;
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) (where.date as Prisma.StringFilter).gte = query.dateFrom;
      if (query.dateTo) (where.date as Prisma.StringFilter).lte = query.dateTo;
    }
    // Security invariant: authenticated ownership filters always win.
    return { ...where, ...base };
  }

  private async findRaw(id: string): Promise<ShiftWithRefs> {
    const shift = await this.prisma.shift.findUnique({ where: { id }, include: shiftInclude });
    if (!shift) {
      throw new NotFoundException('Vardiya bulunamadı.');
    }
    return shift as ShiftWithRefs;
  }

  private validateExtraPair(start?: string | null, end?: string | null) {
    const hasStart = !!start;
    const hasEnd = !!end;
    if (hasStart !== hasEnd) {
      throw new BadRequestException(
        'Ekstra başlangıç ve bitiş saati birlikte girilmeli veya ikisi de boş olmalıdır.',
      );
    }
    if (hasStart && hasEnd) {
      this.assertTimeOrder(start as string, end as string, 'Ekstra');
    }
  }

  // ---------------------------------------------------------------- ADMIN

  async adminFindAll(query: ShiftQueryDto) {
    const shifts = await this.prisma.shift.findMany({
      where: this.buildWhere(query),
      include: shiftInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return (shifts as ShiftWithRefs[]).map((s) => this.serializeAdmin(s));
  }

  async adminFindOne(id: string) {
    return this.serializeAdmin(await this.findRaw(id));
  }

  async adminCreate(dto: CreateShiftDto) {
    this.assertTimeOrder(dto.plannedStartTime, dto.plannedEndTime, 'Planlanan');
    this.validateExtraPair(dto.extraStartTime, dto.extraEndTime);

    const [restaurant, courier] = await Promise.all([
      this.prisma.restaurant.findUnique({ where: { id: dto.restaurantId } }),
      this.prisma.courier.findUnique({ where: { id: dto.courierId } }),
    ]);

    if (!restaurant) throw new NotFoundException('Restoran bulunamadı.');
    if (!restaurant.isActive) throw new BadRequestException('Pasif restoran vardiyaya atanamaz.');
    if (!courier) throw new NotFoundException('Kurye bulunamadı.');
    if (!courier.isActive) throw new BadRequestException('Pasif kurye vardiyaya atanamaz.');

    const shift = await this.prisma.shift.create({
      data: {
        restaurantId: restaurant.id,
        courierId: courier.id,
        date: dto.date,
        plannedStartTime: dto.plannedStartTime,
        plannedEndTime: dto.plannedEndTime,
        extraStartTime: dto.extraStartTime || null,
        extraEndTime: dto.extraEndTime || null,
        // Snapshots: frozen at creation so later rate changes don't rewrite history.
        restaurantHourlyRateSnapshot: restaurant.hourlyRate,
        courierHourlyRateSnapshot: courier.hourlyRate,
        status: ShiftStatus.PLANNED,
        confirmationStatus: ShiftConfirmationStatus.WAITING,
        note: dto.note || null,
      },
      include: shiftInclude,
    });

    return this.serializeAdmin(shift as ShiftWithRefs);
  }

  async adminUpdate(id: string, dto: UpdateShiftDto) {
    const existing = await this.findRaw(id);
    if (existing.confirmationStatus === ShiftConfirmationStatus.ADMIN_APPROVED) {
      throw new BadRequestException('Onaylanmış vardiya düzenlenemez; önce iptal süreci uygulanmalıdır.');
    }
    if (existing.status === ShiftStatus.CANCELLED) {
      throw new BadRequestException('İptal edilmiş vardiya düzenlenemez.');
    }

    const data: Prisma.ShiftUpdateInput = {};

    // Re-snapshot when the assigned restaurant/courier changes.
    if (dto.restaurantId && dto.restaurantId !== existing.restaurantId) {
      const restaurant = await this.prisma.restaurant.findUnique({ where: { id: dto.restaurantId } });
      if (!restaurant) throw new NotFoundException('Restoran bulunamadı.');
      if (!restaurant.isActive) throw new BadRequestException('Pasif restoran vardiyaya atanamaz.');
      data.restaurant = { connect: { id: restaurant.id } };
      data.restaurantHourlyRateSnapshot = restaurant.hourlyRate;
    }
    if (dto.courierId && dto.courierId !== existing.courierId) {
      const courier = await this.prisma.courier.findUnique({ where: { id: dto.courierId } });
      if (!courier) throw new NotFoundException('Kurye bulunamadı.');
      if (!courier.isActive) throw new BadRequestException('Pasif kurye vardiyaya atanamaz.');
      data.courier = { connect: { id: courier.id } };
      data.courierHourlyRateSnapshot = courier.hourlyRate;
    }

    const newStart = dto.plannedStartTime ?? existing.plannedStartTime;
    const newEnd = dto.plannedEndTime ?? existing.plannedEndTime;
    if (dto.plannedStartTime || dto.plannedEndTime) {
      this.assertTimeOrder(newStart, newEnd, 'Planlanan');
      data.plannedStartTime = newStart;
      data.plannedEndTime = newEnd;
    }

    if (dto.extraStartTime !== undefined || dto.extraEndTime !== undefined) {
      const extraStart = dto.extraStartTime !== undefined ? dto.extraStartTime : existing.extraStartTime;
      const extraEnd = dto.extraEndTime !== undefined ? dto.extraEndTime : existing.extraEndTime;
      const normStart = extraStart ? extraStart : null;
      const normEnd = extraEnd ? extraEnd : null;
      this.validateExtraPair(normStart, normEnd);
      data.extraStartTime = normStart;
      data.extraEndTime = normEnd;
    }

    if (dto.date) data.date = dto.date;
    if (dto.note !== undefined) data.note = dto.note || null;

    const updated = await this.prisma.shift.update({
      where: { id },
      data,
      include: shiftInclude,
    });
    return this.serializeAdmin(updated as ShiftWithRefs);
  }

  async adminSetStatus(id: string, status: ShiftStatus) {
    const existing = await this.findRaw(id);
    if (status === ShiftStatus.COMPLETED) {
      throw new BadRequestException('Vardiya yalnızca saat onayı ile tamamlanabilir.');
    }
    if (
      existing.confirmationStatus === ShiftConfirmationStatus.ADMIN_APPROVED &&
      status !== ShiftStatus.CANCELLED
    ) {
      throw new BadRequestException('Onaylanmış vardiyada yalnızca iptal işlemi yapılabilir.');
    }
    const updated = await this.prisma.shift.update({
      where: { id },
      data: { status },
      include: shiftInclude,
    });
    return this.serializeAdmin(updated as ShiftWithRefs);
  }

  async adminApproveTime(id: string, dto: ApproveTimeDto) {
    const existing = await this.findRaw(id);
    if (existing.status === ShiftStatus.CANCELLED) {
      throw new BadRequestException('İptal edilmiş vardiya onaylanamaz.');
    }
    this.assertTimeOrder(dto.approvedStartTime, dto.approvedEndTime, 'Onaylı');

    // Reconcile segments with the approved times: the first segment was anchored
    // to the planned/reported start when the switch happened, but the approved
    // start is the source of truth. Aligning it keeps the per-restaurant hours
    // consistent with the courier's total worked time. The open (last) segment
    // is implicitly closed at the approved end by the revenue helper.
    if (existing.segments.length > 0) {
      const sorted = [...existing.segments].sort((a, b) => a.sequence - b.sequence);
      const first = sorted[0];
      if (first.startTime !== dto.approvedStartTime) {
        await this.prisma.shiftSegment.update({
          where: { id: first.id },
          data: { startTime: dto.approvedStartTime },
        });
      }
    }

    const updated = await this.prisma.shift.update({
      where: { id },
      data: {
        approvedStartTime: dto.approvedStartTime,
        approvedEndTime: dto.approvedEndTime,
        adminNote: dto.adminNote ?? undefined,
        confirmationStatus: ShiftConfirmationStatus.ADMIN_APPROVED,
        status: ShiftStatus.COMPLETED,
      },
      include: shiftInclude,
    });
    return this.serializeAdmin(updated as ShiftWithRefs);
  }

  /**
   * Moves the courier to another restaurant mid-shift. The shift is kept as a
   * single record; the work is split into ShiftSegment intervals. The currently
   * open interval is closed at `switchTime`, then a new open interval at the new
   * restaurant is started. Historical (single-restaurant) shifts are unaffected
   * until the first switch happens.
   */
  async adminSwitchRestaurant(id: string, dto: SwitchRestaurantDto) {
    const shift = await this.findRaw(id);

    if (shift.status === ShiftStatus.CANCELLED) {
      throw new BadRequestException('İptal edilmiş vardiyada restoran değişimi yapılamaz.');
    }

    const newRestaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.newRestaurantId },
    });
    if (!newRestaurant) throw new NotFoundException('Restoran bulunamadı.');
    if (!newRestaurant.isActive) throw new BadRequestException('Pasif restoran vardiyaya atanamaz.');

    const segments = [...shift.segments].sort((a, b) => a.sequence - b.sequence);
    const openSegment = segments.find((s) => s.endTime === null) ?? null;

    // The restaurant the courier is currently working at.
    const currentRestaurantId = openSegment ? openSegment.restaurantId : shift.restaurantId;
    if (currentRestaurantId === dto.newRestaurantId) {
      throw new BadRequestException('Kurye zaten bu restoranda çalışıyor.');
    }

    // Anchor of the current open interval.
    const currentStart = openSegment
      ? openSegment.startTime
      : shift.approvedStartTime ?? shift.courierReportedStartTime ?? shift.plannedStartTime;
    this.assertTimeOrder(currentStart, dto.switchTime, 'Geçiş');

    const nextSequence = segments.length > 0 ? segments[segments.length - 1].sequence + 1 : 1;

    await this.prisma.$transaction(async (tx) => {
      if (openSegment) {
        // Close the open interval.
        await tx.shiftSegment.update({
          where: { id: openSegment.id },
          data: { endTime: dto.switchTime },
        });
      } else {
        // First switch: materialise the original restaurant as segment 0.
        await tx.shiftSegment.create({
          data: {
            shiftId: shift.id,
            restaurantId: shift.restaurantId,
            restaurantHourlyRateSnapshot: shift.restaurantHourlyRateSnapshot,
            startTime: currentStart,
            endTime: dto.switchTime,
            sequence: 0,
          },
        });
      }
      // Open the new interval at the new restaurant.
      await tx.shiftSegment.create({
        data: {
          shiftId: shift.id,
          restaurantId: newRestaurant.id,
          restaurantHourlyRateSnapshot: newRestaurant.hourlyRate,
          startTime: dto.switchTime,
          endTime: null,
          sequence: nextSequence,
        },
      });
      // A switch means the shift is actively being worked.
      if (shift.status === ShiftStatus.PLANNED) {
        await tx.shift.update({
          where: { id: shift.id },
          data: { status: ShiftStatus.IN_PROGRESS },
        });
      }
    });

    return this.serializeAdmin(await this.findRaw(id));
  }

  // ---------------------------------------------------------------- RESTAURANT

  private async restaurantIdForUser(userId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { userId } });
    if (!restaurant) throw new NotFoundException('Bu hesaba bağlı restoran kaydı bulunamadı.');
    return restaurant.id;
  }

  async restaurantFindAll(userId: string, query: PartyShiftQueryDto) {
    const restaurantId = await this.restaurantIdForUser(userId);
    // Include shifts where this restaurant is the primary one OR where the
    // courier switched into this restaurant for part of the shift (a segment).
    const shifts = await this.prisma.shift.findMany({
      where: this.buildWhere(query, {
        OR: [{ restaurantId }, { segments: { some: { restaurantId } } }],
      }),
      include: shiftInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return (shifts as ShiftWithRefs[]).map((s) => this.serializeParty(s, 'restaurant'));
  }

  async restaurantFindOne(userId: string, id: string) {
    const restaurantId = await this.restaurantIdForUser(userId);
    const shift = await this.findRaw(id);
    // A restaurant may view a shift where it is the primary restaurant OR where
    // the courier worked part of the shift at this restaurant (a segment).
    const involved =
      shift.restaurantId === restaurantId ||
      shift.segments.some((seg) => seg.restaurantId === restaurantId);
    if (!involved) {
      throw new ForbiddenException('Bu vardiyaya erişim yetkiniz yok.');
    }
    return this.serializeParty(shift, 'restaurant');
  }

  // ---------------------------------------------------------------- COURIER

  private async courierIdForUser(userId: string): Promise<string> {
    const courier = await this.prisma.courier.findUnique({ where: { userId } });
    if (!courier) throw new NotFoundException('Bu hesaba bağlı kurye kaydı bulunamadı.');
    return courier.id;
  }

  async courierFindAll(userId: string, query: PartyShiftQueryDto) {
    const courierId = await this.courierIdForUser(userId);
    const shifts = await this.prisma.shift.findMany({
      where: this.buildWhere(query, { courierId }),
      include: shiftInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return (shifts as ShiftWithRefs[]).map((s) => this.serializeParty(s, 'courier'));
  }

  async courierFindOne(userId: string, id: string) {
    const courierId = await this.courierIdForUser(userId);
    const shift = await this.findRaw(id);
    if (shift.courierId !== courierId) {
      throw new ForbiddenException('Bu vardiyaya erişim yetkiniz yok.');
    }
    return this.serializeParty(shift, 'courier');
  }

  async courierReportTime(userId: string, id: string, dto: ReportTimeDto) {
    const courierId = await this.courierIdForUser(userId);
    const shift = await this.findRaw(id);
    if (shift.courierId !== courierId) {
      throw new ForbiddenException('Bu vardiyaya erişim yetkiniz yok.');
    }
    return this.applyReport(shift, 'courier', dto);
  }

  // ---------------------------------------------------------------- shared report

  private async applyReport(shift: ShiftWithRefs, who: 'restaurant' | 'courier', dto: ReportTimeDto) {
    if (shift.status === ShiftStatus.CANCELLED) {
      throw new BadRequestException('İptal edilmiş vardiyaya saat bildirilemez.');
    }
    if (!dto.reportedStartTime && !dto.reportedEndTime) {
      throw new BadRequestException('En az bir saat (başlangıç veya bitiş) girilmelidir.');
    }
    // When both provided, end must be after start.
    if (dto.reportedStartTime && dto.reportedEndTime) {
      this.assertTimeOrder(dto.reportedStartTime, dto.reportedEndTime, 'Bildirilen');
    }

    const data: Prisma.ShiftUpdateInput = {};
    // Reporting new times on an already-approved shift reopens it (e.g. the
    // courier worked extra overtime after approval). The previous approval is
    // cleared so an admin must approve again; until then the shift leaves the
    // reports/accounting.
    const reopened = shift.confirmationStatus === ShiftConfirmationStatus.ADMIN_APPROVED;
    if (reopened) {
      data.approvedStartTime = null;
      data.approvedEndTime = null;
    }
    const merged = {
      restaurantReportedStartTime: shift.restaurantReportedStartTime,
      restaurantReportedEndTime: shift.restaurantReportedEndTime,
      courierReportedStartTime: shift.courierReportedStartTime,
      courierReportedEndTime: shift.courierReportedEndTime,
      status: reopened && shift.status === ShiftStatus.COMPLETED ? ShiftStatus.IN_PROGRESS : shift.status,
      confirmationStatus: reopened ? ShiftConfirmationStatus.WAITING : shift.confirmationStatus,
    };

    if (who === 'restaurant') {
      if (dto.reportedStartTime) {
        data.restaurantReportedStartTime = dto.reportedStartTime;
        merged.restaurantReportedStartTime = dto.reportedStartTime;
      }
      if (dto.reportedEndTime) {
        data.restaurantReportedEndTime = dto.reportedEndTime;
        merged.restaurantReportedEndTime = dto.reportedEndTime;
      }
    } else {
      if (dto.reportedStartTime) {
        data.courierReportedStartTime = dto.reportedStartTime;
        merged.courierReportedStartTime = dto.reportedStartTime;
      }
      if (dto.reportedEndTime) {
        data.courierReportedEndTime = dto.reportedEndTime;
        merged.courierReportedEndTime = dto.reportedEndTime;
      }
    }

    const derived = this.deriveConfirmation(merged);
    data.confirmationStatus = derived.confirmationStatus;
    data.status = derived.status;

    const updated = await this.prisma.shift.update({
      where: { id: shift.id },
      data,
      include: shiftInclude,
    });
    return this.serializeParty(updated as ShiftWithRefs, who);
  }
}
