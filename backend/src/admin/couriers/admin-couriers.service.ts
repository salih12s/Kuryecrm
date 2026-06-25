import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourierDto } from '../dto/create-courier.dto';
import { UpdateCourierDto } from '../dto/update-courier.dto';
import { ListQueryDto } from '../dto/list-query.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AdminCouriersService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(courier: {
    id: string;
    name: string;
    phone: string;
    plate: string | null;
    hourlyRate: Prisma.Decimal;
    isActive: boolean;
    approvalStatus: ApprovalStatus;
    rejectionNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: { id: string; username: string; isActive: boolean };
  }) {
    return {
      id: courier.id,
      name: courier.name,
      phone: courier.phone,
      plate: courier.plate,
      hourlyRate: courier.hourlyRate.toString(),
      isActive: courier.isActive,
      approvalStatus: courier.approvalStatus,
      rejectionNote: courier.rejectionNote,
      username: courier.user.username,
      userId: courier.user.id,
      createdAt: courier.createdAt,
      updatedAt: courier.updatedAt,
    };
  }

  async findAll(query: ListQueryDto) {
    // All non-deleted records show in the list (including pending ones, flagged
    // with their approval status in the UI). The optional active/passive filter
    // is still used by other screens (e.g. shift dropdowns request only
    // active = approved & enabled records).
    const where: Prisma.CourierWhereInput = { deletedAt: null };

    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'passive') where.isActive = false;

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { plate: { contains: term, mode: 'insensitive' } },
        { user: { username: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const couriers = await this.prisma.courier.findMany({
      where,
      include: { user: { select: { id: true, username: true, isActive: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return couriers.map((c) => this.serialize(c));
  }

  async findOne(id: string) {
    const courier = await this.prisma.courier.findUnique({
      where: { id },
      include: { user: { select: { id: true, username: true, isActive: true } } },
    });

    if (!courier) {
      throw new NotFoundException('Kurye bulunamadı.');
    }

    return this.serialize(courier);
  }

  async create(dto: CreateCourierDto) {
    const username = dto.username.toLowerCase().trim();
    await this.assertUsernameAvailable(username);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Every new record - whoever creates it - lands in the admin approval
    // queue. It stays inactive (cannot log in, cannot be assigned to shifts)
    // and only appears in the couriers list once an admin approves it.
    const approvalStatus = ApprovalStatus.PENDING;
    const isActive = false;

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          username,
          passwordHash,
          role: Role.COURIER,
          isActive,
          courier: {
            create: {
              name: dto.name,
              phone: dto.phone,
              plate: dto.plate || null,
              hourlyRate: new Prisma.Decimal(dto.hourlyRate),
              isActive,
              approvalStatus,
            },
          },
        },
        include: { courier: { include: { user: { select: { id: true, username: true, isActive: true } } } } },
      });

      return this.serialize(user.courier!);
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  async update(id: string, dto: UpdateCourierDto, updaterRole: Role) {
    const courier = await this.prisma.courier.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!courier) {
      throw new NotFoundException('Kurye bulunamadı.');
    }

    // Only admins control active status; ignore it for Kurye Şefi so they
    // cannot bypass approval by activating a record through an edit.
    if (updaterRole !== Role.ADMIN) dto.isActive = undefined;

    const userData: Prisma.UserUpdateInput = {};
    if (dto.username) {
      const username = dto.username.toLowerCase().trim();
      if (username !== courier.user.username) {
        await this.assertUsernameAvailable(username, courier.userId);
        userData.username = username;
      }
    }
    if (dto.name) userData.name = dto.name;
    if (dto.password && dto.password.length > 0) {
      userData.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }
    if (dto.isActive !== undefined) userData.isActive = dto.isActive;

    const courierData: Prisma.CourierUpdateInput = {};
    if (dto.name) courierData.name = dto.name;
    if (dto.phone) courierData.phone = dto.phone;
    if (dto.plate !== undefined) courierData.plate = dto.plate || null;
    if (dto.hourlyRate !== undefined) {
      courierData.hourlyRate = new Prisma.Decimal(dto.hourlyRate);
    }
    if (dto.isActive !== undefined) courierData.isActive = dto.isActive;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (Object.keys(userData).length > 0) {
          await tx.user.update({ where: { id: courier.userId }, data: userData });
        }
        return tx.courier.update({
          where: { id },
          data: courierData,
          include: { user: { select: { id: true, username: true, isActive: true } } },
        });
      });
      return this.serialize(updated);
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  /**
   * Soft-deletes a courier: it disappears from the management lists and can no
   * longer log in, but its shifts, advances and payments stay in the database
   * so historical reports are unaffected. The login username is freed (suffixed)
   * so a new courier can reuse it later.
   */
  async remove(id: string) {
    const courier = await this.prisma.courier.findUnique({
      where: { id },
      include: { user: { select: { username: true } } },
    });
    if (!courier) {
      throw new NotFoundException('Kurye bulunamadı.');
    }
    if (courier.deletedAt) return { id };

    const freedUsername = `${courier.user.username}__del_${Date.now()}`;
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: courier.userId },
        data: { isActive: false, username: freedUsername },
      }),
      this.prisma.courier.update({
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
