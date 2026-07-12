import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalDecisionDto } from '../dto/approval-decision.dto';
import { ShiftsService } from '../../shifts/shifts.service';

/**
 * Admin-only review queue for courier/restaurant records created by a Kurye
 * Şefi/Müdür, and shift create/edit requests submitted by a Müdür. Pending
 * records/requests are inactive/unapplied until approved; rejecting records
 * the reason and leaves them that way.
 */
@Injectable()
export class AdminApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shifts: ShiftsService,
  ) {}

  async listPending() {
    const [couriers, restaurants, shiftChangeRequests] = await Promise.all([
      this.prisma.courier.findMany({
        where: { approvalStatus: ApprovalStatus.PENDING },
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.restaurant.findMany({
        where: { approvalStatus: ApprovalStatus.PENDING },
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.shifts.listPendingChangeRequests(),
    ]);

    return {
      couriers: couriers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        plate: c.plate,
        username: c.user.username,
        hourlyRate: c.hourlyRate.toString(),
        createdAt: c.createdAt,
      })),
      restaurants: restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        authorizedPerson: r.authorizedPerson,
        phone: r.phone,
        username: r.user.username,
        hourlyRate: r.hourlyRate.toString(),
        createdAt: r.createdAt,
      })),
      shiftChangeRequests,
      totalPending: couriers.length + restaurants.length + shiftChangeRequests.length,
    };
  }

  decideShiftChange(id: string, dto: ApprovalDecisionDto, reviewedById: string) {
    return this.shifts.decideChangeRequest(id, dto.action, dto.note, reviewedById);
  }

  async decideCourier(id: string, dto: ApprovalDecisionDto) {
    const courier = await this.prisma.courier.findUnique({ where: { id } });
    if (!courier) throw new NotFoundException('Kurye bulunamadı.');
    if (courier.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Bu kayıt zaten karara bağlanmış.');
    }

    const approved = dto.action === 'approve';
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: courier.userId }, data: { isActive: approved } });
      await tx.courier.update({
        where: { id },
        data: {
          isActive: approved,
          approvalStatus: approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
          rejectionNote: approved ? null : dto.note ?? null,
        },
      });
    });

    return { id, approvalStatus: approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED };
  }

  async decideRestaurant(id: string, dto: ApprovalDecisionDto) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restoran bulunamadı.');
    if (restaurant.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Bu kayıt zaten karara bağlanmış.');
    }

    const approved = dto.action === 'approve';
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: restaurant.userId }, data: { isActive: approved } });
      await tx.restaurant.update({
        where: { id },
        data: {
          isActive: approved,
          approvalStatus: approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
          rejectionNote: approved ? null : dto.note ?? null,
        },
      });
    });

    return { id, approvalStatus: approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED };
  }
}
