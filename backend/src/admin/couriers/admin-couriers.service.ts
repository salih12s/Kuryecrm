import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
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
    hourlyRate: Prisma.Decimal;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    user: { id: string; email: string; isActive: boolean };
  }) {
    return {
      id: courier.id,
      name: courier.name,
      phone: courier.phone,
      hourlyRate: courier.hourlyRate.toString(),
      isActive: courier.isActive,
      email: courier.user.email,
      userId: courier.user.id,
      createdAt: courier.createdAt,
      updatedAt: courier.updatedAt,
    };
  }

  async findAll(query: ListQueryDto) {
    const where: Prisma.CourierWhereInput = {};

    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'passive') where.isActive = false;

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const couriers = await this.prisma.courier.findMany({
      where,
      include: { user: { select: { id: true, email: true, isActive: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return couriers.map((c) => this.serialize(c));
  }

  async findOne(id: string) {
    const courier = await this.prisma.courier.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });

    if (!courier) {
      throw new NotFoundException('Kurye bulunamadı.');
    }

    return this.serialize(courier);
  }

  async create(dto: CreateCourierDto) {
    const email = dto.email.toLowerCase().trim();
    await this.assertEmailAvailable(email);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const isActive = dto.isActive ?? true;

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email,
          passwordHash,
          role: Role.COURIER,
          isActive,
          courier: {
            create: {
              name: dto.name,
              phone: dto.phone,
              hourlyRate: new Prisma.Decimal(dto.hourlyRate),
              isActive,
            },
          },
        },
        include: { courier: { include: { user: { select: { id: true, email: true, isActive: true } } } } },
      });

      return this.serialize(user.courier!);
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  async update(id: string, dto: UpdateCourierDto) {
    const courier = await this.prisma.courier.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!courier) {
      throw new NotFoundException('Kurye bulunamadı.');
    }

    const userData: Prisma.UserUpdateInput = {};
    if (dto.email) {
      const email = dto.email.toLowerCase().trim();
      if (email !== courier.user.email) {
        await this.assertEmailAvailable(email, courier.userId);
        userData.email = email;
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
          include: { user: { select: { id: true, email: true, isActive: true } } },
        });
      });
      return this.serialize(updated);
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  /**
   * Soft enable/disable. Keeps Courier.isActive and the linked User.isActive
   * in sync so a passive courier cannot log in.
   */
  async setStatus(id: string, isActive: boolean) {
    const courier = await this.prisma.courier.findUnique({ where: { id } });
    if (!courier) {
      throw new NotFoundException('Kurye bulunamadı.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: courier.userId }, data: { isActive } });
      return tx.courier.update({
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
