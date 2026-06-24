import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRestaurantDto } from '../dto/create-restaurant.dto';
import { UpdateRestaurantDto } from '../dto/update-restaurant.dto';
import { ListQueryDto } from '../dto/list-query.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AdminRestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Shapes a restaurant + its linked user into the API response. */
  private serialize(restaurant: {
    id: string;
    name: string;
    authorizedPerson: string;
    phone: string;
    address: string;
    hourlyRate: Prisma.Decimal;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    user: { id: string; email: string; isActive: boolean };
  }) {
    return {
      id: restaurant.id,
      name: restaurant.name,
      authorizedPerson: restaurant.authorizedPerson,
      phone: restaurant.phone,
      address: restaurant.address,
      hourlyRate: restaurant.hourlyRate.toString(),
      isActive: restaurant.isActive,
      email: restaurant.user.email,
      userId: restaurant.user.id,
      createdAt: restaurant.createdAt,
      updatedAt: restaurant.updatedAt,
    };
  }

  async findAll(query: ListQueryDto) {
    const where: Prisma.RestaurantWhereInput = {};

    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'passive') where.isActive = false;

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { authorizedPerson: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const restaurants = await this.prisma.restaurant.findMany({
      where,
      include: { user: { select: { id: true, email: true, isActive: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return restaurants.map((r) => this.serialize(r));
  }

  async findOne(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });

    if (!restaurant) {
      throw new NotFoundException('Restoran bulunamadı.');
    }

    return this.serialize(restaurant);
  }

  async create(dto: CreateRestaurantDto) {
    const email = dto.email.toLowerCase().trim();
    await this.assertEmailAvailable(email);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const isActive = dto.isActive ?? true;

    try {
      // User + Restaurant are created atomically via a nested write.
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email,
          passwordHash,
          role: Role.RESTAURANT,
          isActive,
          restaurant: {
            create: {
              name: dto.name,
              authorizedPerson: dto.authorizedPerson,
              phone: dto.phone,
              address: dto.address ?? '',
              hourlyRate: new Prisma.Decimal(dto.hourlyRate),
              isActive,
            },
          },
        },
        include: { restaurant: { include: { user: { select: { id: true, email: true, isActive: true } } } } },
      });

      return this.serialize(user.restaurant!);
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  async update(id: string, dto: UpdateRestaurantDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!restaurant) {
      throw new NotFoundException('Restoran bulunamadı.');
    }

    // Email change requires a uniqueness check against other users.
    const userData: Prisma.UserUpdateInput = {};
    if (dto.email) {
      const email = dto.email.toLowerCase().trim();
      if (email !== restaurant.user.email) {
        await this.assertEmailAvailable(email, restaurant.userId);
        userData.email = email;
      }
    }
    if (dto.name) userData.name = dto.name;
    // Empty password => keep existing; only re-hash when a value is provided.
    if (dto.password && dto.password.length > 0) {
      userData.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }
    if (dto.isActive !== undefined) userData.isActive = dto.isActive;

    const restaurantData: Prisma.RestaurantUpdateInput = {};
    if (dto.name) restaurantData.name = dto.name;
    if (dto.authorizedPerson) restaurantData.authorizedPerson = dto.authorizedPerson;
    if (dto.phone) restaurantData.phone = dto.phone;
    if (dto.address !== undefined) restaurantData.address = dto.address;
    if (dto.hourlyRate !== undefined) {
      restaurantData.hourlyRate = new Prisma.Decimal(dto.hourlyRate);
    }
    if (dto.isActive !== undefined) restaurantData.isActive = dto.isActive;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (Object.keys(userData).length > 0) {
          await tx.user.update({ where: { id: restaurant.userId }, data: userData });
        }
        return tx.restaurant.update({
          where: { id },
          data: restaurantData,
          include: { user: { select: { id: true, email: true, isActive: true } } },
        });
      });
      return this.serialize(updated);
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  /**
   * Soft enable/disable. Keeps Restaurant.isActive and the linked
   * User.isActive in sync so a passive restaurant cannot log in.
   */
  async setStatus(id: string, isActive: boolean) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      throw new NotFoundException('Restoran bulunamadı.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: restaurant.userId }, data: { isActive } });
      return tx.restaurant.update({
        where: { id },
        data: { isActive },
        include: { user: { select: { id: true, email: true, isActive: true } } },
      });
    });

    return this.serialize(updated);
  }

  private async assertEmailAvailable(email: string, ignoreUserId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== ignoreUserId) {
      throw new ConflictException('Bu e-posta adresi zaten kullanılıyor.');
    }
  }

  private handlePrismaError(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException('Bu e-posta adresi zaten kullanılıyor.');
    }
    throw e;
  }
}
