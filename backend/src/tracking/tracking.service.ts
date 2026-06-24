import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ShiftStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { lateMinutes, splitNormalOvertime, toMinutes } from '../common/time.util';
import { RecordLocationDto } from './dto/record-location.dto';

// How long before/after the planned window a courier is still considered
// "on shift" for tracking purposes (minutes).
const START_GRACE_MIN = 15;
const OVERTIME_GRACE_MIN = 240;

const shiftWithRefs = {
  courier: { select: { id: true, name: true, plate: true, user: { select: { username: true } } } },
  restaurant: { select: { id: true, name: true } },
  segments: { include: { restaurant: { select: { id: true, name: true } } }, orderBy: { sequence: 'asc' } },
} satisfies Prisma.ShiftInclude;

type ShiftWithRefs = Prisma.ShiftGetPayload<{ include: typeof shiftWithRefs }>;

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /** Today's date + minutes-since-midnight in the operation timezone. */
  private nowInIstanbul(): { date: string; minutes: number } {
    const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
    const time = new Date().toLocaleTimeString('en-GB', {
      timeZone: 'Europe/Istanbul',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    return { date, minutes: toMinutes(time) };
  }

  /** True when "now" falls inside the trackable window of a shift. */
  private isTrackableNow(shift: { plannedStartTime: string; plannedEndTime: string }, nowMin: number): boolean {
    const start = toMinutes(shift.plannedStartTime) - START_GRACE_MIN;
    let end = toMinutes(shift.plannedEndTime);
    if (end <= toMinutes(shift.plannedStartTime)) end += 1440; // midnight crossover
    end += OVERTIME_GRACE_MIN;
    let now = nowMin;
    if (now < start) now += 1440; // handle crossover when now is past midnight
    return now >= start && now <= end;
  }

  private currentRestaurant(shift: ShiftWithRefs): { id: string; name: string } {
    const open = shift.segments.find((s) => s.endTime === null);
    if (open) return { id: open.restaurantId, name: open.restaurant.name };
    return { id: shift.restaurantId, name: shift.restaurant.name };
  }

  /**
   * The courier's shift that is trackable right now, if any. Tracking depends on
   * the time window (today + planned window + grace), not on the accounting
   * status: a courier still physically on shift keeps sharing location even if
   * their time was already approved. Only cancelled shifts are excluded.
   */
  private async activeShift(courierId: string): Promise<ShiftWithRefs | null> {
    const { date, minutes } = this.nowInIstanbul();
    const shifts = await this.prisma.shift.findMany({
      where: {
        courierId,
        date,
        status: { not: ShiftStatus.CANCELLED },
      },
      include: shiftWithRefs,
      orderBy: { plannedStartTime: 'asc' },
    });
    return (shifts as ShiftWithRefs[]).find((s) => this.isTrackableNow(s, minutes)) ?? null;
  }

  private async courierForUser(userId: string) {
    const courier = await this.prisma.courier.findUnique({ where: { userId } });
    if (!courier) throw new NotFoundException('Bu hesaba bağlı kurye kaydı bulunamadı.');
    return courier;
  }

  // ---------------------------------------------------------------- COURIER

  async trackingStatus(userId: string) {
    const courier = await this.courierForUser(userId);
    const [shift, intervalSeconds] = await Promise.all([
      this.activeShift(courier.id),
      this.settings.getInt('courier_location_interval_seconds'),
    ]);
    if (!shift) {
      return { tracking: false, intervalSeconds, shiftId: null, restaurantId: null, restaurantName: null };
    }
    const restaurant = this.currentRestaurant(shift);
    return {
      tracking: true,
      intervalSeconds,
      shiftId: shift.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    };
  }

  async recordLocation(userId: string, dto: RecordLocationDto) {
    const courier = await this.courierForUser(userId);
    const shift = await this.activeShift(courier.id);
    if (!shift) {
      // Tracking is only allowed during an active shift; off-duty pings are rejected.
      throw new ForbiddenException('Aktif vardiya bulunmadığı için konum kaydedilmedi.');
    }
    const restaurant = this.currentRestaurant(shift);

    let recordedAt = new Date();
    if (dto.recordedAt) {
      const parsed = new Date(dto.recordedAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Geçersiz konum zamanı.');
      }
      recordedAt = parsed;
    }

    await this.prisma.courierLocation.create({
      data: {
        courierId: courier.id,
        shiftId: shift.id,
        restaurantId: restaurant.id,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed ?? null,
        accuracy: dto.accuracy ?? null,
        deviceStatus: dto.deviceStatus ?? null,
        connectionStatus: dto.connectionStatus ?? null,
        recordedAt,
      },
    });

    return { ok: true, shiftId: shift.id, restaurantId: restaurant.id };
  }

  // ---------------------------------------------------------------- ADMIN / KURYE ŞEFİ

  /** Active couriers with their latest position + online/offline state, plus restaurant pins. */
  async liveMap() {
    const { date, minutes } = this.nowInIstanbul();
    const offlineThreshold = await this.settings.getInt('courier_offline_threshold_seconds');

    // For the live map we keep any of today's shifts that are still inside their
    // trackable window (planned window + grace) except cancelled ones. Completed
    // shifts are kept too so a courier whose time was already approved still
    // shows at their last known position instead of vanishing from the map.
    const shifts = (await this.prisma.shift.findMany({
      where: { date, status: { not: ShiftStatus.CANCELLED } },
      include: shiftWithRefs,
      orderBy: { plannedStartTime: 'asc' },
    })) as ShiftWithRefs[];

    const active = shifts.filter((s) => this.isTrackableNow(s, minutes));

    const couriers = await Promise.all(
      active.map(async (shift) => {
        const last = await this.prisma.courierLocation.findFirst({
          where: { shiftId: shift.id },
          orderBy: { createdAt: 'desc' },
        });
        const restaurant = this.currentRestaurant(shift);
        const late = lateMinutes(shift.plannedStartTime, shift.courierReportedStartTime ?? shift.approvedStartTime);
        const actualStart = shift.approvedStartTime ?? shift.courierReportedStartTime;
        const actualEnd = shift.approvedEndTime ?? shift.courierReportedEndTime;
        const overtimeHours =
          actualStart && actualEnd
            ? splitNormalOvertime(shift.plannedEndTime, actualStart, actualEnd).overtimeHours
            : 0;

        const secondsAgo = last ? Math.round((Date.now() - last.createdAt.getTime()) / 1000) : null;
        const online = secondsAgo !== null && secondsAgo <= offlineThreshold;

        return {
          courierId: shift.courierId,
          courierName: shift.courier.name,
          courierUsername: shift.courier.user?.username ?? null,
          courierPlate: shift.courier.plate,
          shiftId: shift.id,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          plannedStartTime: shift.plannedStartTime,
          plannedEndTime: shift.plannedEndTime,
          lateMinutes: late,
          isLate: late > 0,
          overtimeHours,
          latitude: last?.latitude ?? null,
          longitude: last?.longitude ?? null,
          speed: last?.speed ?? null,
          accuracy: last?.accuracy ?? null,
          lastLocationAt: last?.createdAt ?? null,
          secondsAgo,
          online,
          hasLocation: !!last,
        };
      }),
    );

    const restaurants = await this.prisma.restaurant.findMany({
      where: { isActive: true, latitude: { not: null }, longitude: { not: null } },
      select: { id: true, name: true, address: true, latitude: true, longitude: true, locationNote: true },
      orderBy: { name: 'asc' },
    });

    return {
      offlineThresholdSeconds: offlineThreshold,
      generatedAt: new Date(),
      couriers,
      restaurants,
    };
  }

  /** Ordered location trail for one shift (used for route/history in reports). */
  async shiftLocations(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Vardiya bulunamadı.');
    const locations = await this.prisma.courierLocation.findMany({
      where: { shiftId },
      orderBy: { createdAt: 'asc' },
    });
    return locations.map((l) => ({
      id: l.id,
      latitude: l.latitude,
      longitude: l.longitude,
      speed: l.speed,
      accuracy: l.accuracy,
      restaurantId: l.restaurantId,
      recordedAt: l.recordedAt,
      createdAt: l.createdAt,
    }));
  }
}
