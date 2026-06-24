import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalDecisionDto } from '../dto/approval-decision.dto';

/**
 * Admin-only review queue for courier/restaurant records created by a Kurye
 * Şefi. Pending records are inactive until approved; rejecting keeps them
 * inactive and records the reason.
 */
@Injectable()
export class AdminApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPending() {
    const [couriers, restaurants] = await Promise.all([
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
      totalPending: couriers.length + restaurants.length,
    };
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
