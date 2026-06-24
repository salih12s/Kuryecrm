import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Phase 1 admin summary: simple system-wide counts.
   * Operational metrics are added in later phases.
   */
  async dashboard() {
    const [totalUsers, totalAdmins, totalRestaurants, totalCouriers, activeUsers] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: Role.ADMIN } }),
        this.prisma.restaurant.count(),
        this.prisma.courier.count(),
        this.prisma.user.count({ where: { isActive: true } }),
      ]);

    return {
      title: 'Admin Paneli',
      summary: {
        totalUsers,
        activeUsers,
        totalAdmins,
        totalRestaurants,
        totalCouriers,
      },
    };
  }
}
