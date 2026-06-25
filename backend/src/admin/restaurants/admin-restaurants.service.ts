import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus, Prisma, Role } from '@prisma/client';
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
    approvalStatus: ApprovalStatus;
    rejectionNote: string | null;
    latitude: number | null;
    longitude: number | null;
    locationNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: { id: string; username: string; isActive: boolean };
  }) {
    return {
      id: restaurant.id,
      name: restaurant.name,
      authorizedPerson: restaurant.authorizedPerson,
      phone: restaurant.phone,
      address: restaurant.address,
      hourlyRate: restaurant.hourlyRate.toString(),
      isActive: restaurant.isActive,
      approvalStatus: restaurant.approvalStatus,
      rejectionNote: restaurant.rejectionNote,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      locationNote: restaurant.locationNote,
      username: restaurant.user.username,
      userId: restaurant.user.id,
      createdAt: restaurant.createdAt,
      updatedAt: restaurant.updatedAt,
    };
  }

  async findAll(query: ListQueryDto) {
    // All non-deleted records show in the list (including pending ones, flagged
    // with their approval status in the UI). The optional active/passive filter
    // is still used by other screens (e.g. shift dropdowns request only
    // active = approved & enabled records).
    const where: Prisma.RestaurantWhereInput = { deletedAt: null };

    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'passive') where.isActive = false;

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { authorizedPerson: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { user: { username: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const restaurants = await this.prisma.restaurant.findMany({
      where,
      include: { user: { select: { id: true, username: true, isActive: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return restaurants.map((r) => this.serialize(r));
  }

  async findOne(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { user: { select: { id: true, username: true, isActive: true } } },
    });

    if (!restaurant) {
      throw new NotFoundException('Restoran bulunamadı.');
    }

    return this.serialize(restaurant);
  }

  async create(dto: CreateRestaurantDto) {
    const username = dto.username.toLowerCase().trim();
    await this.assertUsernameAvailable(username);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Every new record - whoever creates it - lands in the admin approval
    // queue. It stays inactive (cannot log in, cannot be assigned to shifts)
    // and only appears in the restaurants list once an admin approves it.
    const approvalStatus = ApprovalStatus.PENDING;
    const isActive = false;

    try {
      // User + Restaurant are created atomically via a nested write.
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          username,
          passwordHash,
          role: Role.RESTAURANT,
          isActive,
          restaurant: {
            create: {
              name: dto.name,
              authorizedPerson: dto.authorizedPerson,
              phone: dto.phone,
              address: dto.address ?? '',
              latitude: dto.latitude ?? null,
              longitude: dto.longitude ?? null,
              locationNote: dto.locationNote ?? null,
              hourlyRate: new Prisma.Decimal(dto.hourlyRate),
              isActive,
              approvalStatus,
            },
          },
        },
        include: { restaurant: { include: { user: { select: { id: true, username: true, isActive: true } } } } },
      });

      return this.serialize(user.restaurant!);
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  async update(id: string, dto: UpdateRestaurantDto, updaterRole: Role) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!restaurant) {
      throw new NotFoundException('Restoran bulunamadı.');
    }

    // Only admins control active status; ignore it for Kurye Şefi so they
    // cannot bypass approval by activating a record through an edit.
    if (updaterRole !== Role.ADMIN) dto.isActive = undefined;

    // Username change requires a uniqueness check against other users.
    const userData: Prisma.UserUpdateInput = {};
    if (dto.username) {
      const username = dto.username.toLowerCase().trim();
      if (username !== restaurant.user.username) {
        await this.assertUsernameAvailable(username, restaurant.userId);
        userData.username = username;
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
    if (dto.latitude !== undefined) restaurantData.latitude = dto.latitude;
    if (dto.longitude !== undefined) restaurantData.longitude = dto.longitude;
    if (dto.locationNote !== undefined) restaurantData.locationNote = dto.locationNote || null;
    if (dto.isActive !== undefined) restaurantData.isActive = dto.isActive;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (Object.keys(userData).length > 0) {
          await tx.user.update({ where: { id: restaurant.userId }, data: userData });
        }
        return tx.restaurant.update({
          where: { id },
          data: restaurantData,
          include: { user: { select: { id: true, username: true, isActive: true } } },
        });
      });
      return this.serialize(updated);
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  /**
   * Soft-deletes a restaurant: it disappears from the management lists and can
   * no longer log in, but its shifts, invoices and payments stay in the
   * database so historical reports are unaffected. The login username is freed
   * (suffixed) so a new restaurant can reuse it later.
   */
  async remove(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { user: { select: { username: true } } },
    });
    if (!restaurant) {
      throw new NotFoundException('Restoran bulunamadı.');
    }
    if (restaurant.deletedAt) return { id };

    const freedUsername = `${restaurant.user.username}__del_${Date.now()}`;
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: restaurant.userId },
        data: { isActive: false, username: freedUsername },
      }),
      this.prisma.restaurant.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      }),
    ]);
    return { id };
  }

  private async assertUsernameAvailable(username: string, ignoreUserId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== ignoreUserId) {
      throw new ConflictException('Bu kullanıcı adı zaten kullanılıyor.');
    }
  }

  private handlePrismaError(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException('Bu kullanıcı adı zaten kullanılıyor.');
    }
    throw e;
  }
}
