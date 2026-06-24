import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class RestaurantService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Phase 1 restaurant summary. Data is strictly scoped to the logged-in
   * user's own restaurant so one restaurant can never see another's data.
   */
  async dashboard(user: AuthUser) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId: user.userId },
    });

    if (!restaurant) {
      throw new NotFoundException('Bu hesaba bağlı restoran kaydı bulunamadı.');
    }

    return {
      title: 'Restoran Paneli',
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        authorizedPerson: restaurant.authorizedPerson,
        phone: restaurant.phone,
        address: restaurant.address,
        hourlyRate: restaurant.hourlyRate,
        isActive: restaurant.isActive,
      },
    };
  }
}
