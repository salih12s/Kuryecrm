import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

const MANAGEMENT_ROLES: Role[] = [Role.ADMIN, Role.KURYE_SEFI, Role.PARTNER];

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(user: any) {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      profile: user.restaurant
        ? { type: 'restaurant', id: user.restaurant.id, name: user.restaurant.name }
        : user.courier
          ? { type: 'courier', id: user.courier.id, name: user.courier.name }
          : null,
    };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      // Hide users whose restaurant/courier profile was soft-deleted.
      where: {
        AND: [
          { OR: [{ restaurant: { is: null } }, { restaurant: { deletedAt: null } }] },
          { OR: [{ courier: { is: null } }, { courier: { deletedAt: null } }] },
        ],
      },
      include: {
        restaurant: { select: { id: true, name: true } },
        courier: { select: { id: true, name: true } },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
    return users.map((user) => this.serialize(user));
  }

  async create(dto: CreateUserDto) {
    if (!MANAGEMENT_ROLES.includes(dto.role)) {
      throw new BadRequestException('Restoran ve kurye hesapları kendi sayfalarından oluşturulmalıdır.');
    }
    const username = dto.username.toLowerCase().trim();
    if (await this.prisma.user.findUnique({ where: { username } })) {
      throw new ConflictException('Bu kullanıcı adı zaten kullanılıyor.');
    }
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        username,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: dto.role,
        isActive: dto.isActive ?? true,
      },
      include: { restaurant: true, courier: true },
    });
    return this.serialize(user);
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { restaurant: true, courier: true },
    });
    if (!existing) throw new NotFoundException('Kullanıcı bulunamadı.');

    if (id === currentUserId && (dto.isActive === false || (dto.role && dto.role !== Role.ADMIN))) {
      throw new BadRequestException('Kendi admin hesabınızı kapatamaz veya rolünü düşüremezsiniz.');
    }
    if ((existing.restaurant || existing.courier) && dto.role && dto.role !== existing.role) {
      throw new BadRequestException('Restoran ve kurye hesaplarının rolü değiştirilemez.');
    }
    if (!existing.restaurant && !existing.courier && dto.role && !MANAGEMENT_ROLES.includes(dto.role)) {
      throw new BadRequestException('Yönetim kullanıcısına restoran veya kurye rolü verilemez.');
    }
    if (existing.role === Role.ADMIN && (dto.isActive === false || (dto.role && dto.role !== Role.ADMIN))) {
      const activeAdmins = await this.prisma.user.count({ where: { role: Role.ADMIN, isActive: true } });
      if (activeAdmins <= 1) throw new BadRequestException('Sistemde en az bir aktif admin kalmalıdır.');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
    if (dto.username !== undefined) {
      const username = dto.username.toLowerCase().trim();
      const duplicate = await this.prisma.user.findFirst({ where: { username, id: { not: id } } });
      if (duplicate) throw new ConflictException('Bu kullanıcı adı zaten kullanılıyor.');
      data.username = username;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: { restaurant: true, courier: true },
    });
    return this.serialize(user);
  }
}
