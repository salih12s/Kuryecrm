import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class CourierService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Phase 1 courier summary. Data is strictly scoped to the logged-in
   * user's own courier record so one courier can never see another's data.
   */
  async dashboard(user: AuthUser) {
    const courier = await this.prisma.courier.findUnique({
      where: { userId: user.userId },
    });

    if (!courier) {
      throw new NotFoundException('Bu hesaba bağlı kurye kaydı bulunamadı.');
    }

    return {
      title: 'Kurye Paneli',
      courier: {
        id: courier.id,
        name: courier.name,
        phone: courier.phone,
        hourlyRate: courier.hourlyRate,
        isActive: courier.isActive,
      },
    };
  }
}
