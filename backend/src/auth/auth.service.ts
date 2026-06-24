import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from './decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly settings: SettingsService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username.toLowerCase().trim() },
    });

    // Generic message on purpose: do not reveal whether the username exists.
    if (!user) {
      throw new UnauthorizedException('Kullanıcı adı veya şifre hatalı.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Hesabınız pasif durumda. Yönetici ile iletişime geçin.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Kullanıcı adı veya şifre hatalı.');
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);

    const financeEditable =
      user.role === Role.ADMIN
        ? true
        : user.role === Role.PARTNER
          ? await this.settings.getBool('partners_can_edit_finance')
          : false;

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        financeEditable,
      },
    };
  }

  /**
   * Returns the full profile for the currently authenticated user,
   * including the role-specific record when present.
   */
  async me(authUser: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: authUser.userId },
      include: {
        restaurant: true,
        courier: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı.');
    }

    // Admins always edit finance; partners only when the setting is enabled.
    // Non-finance roles get false (they don't see finance screens anyway).
    const financeEditable =
      user.role === Role.ADMIN
        ? true
        : user.role === Role.PARTNER
          ? await this.settings.getBool('partners_can_edit_finance')
          : false;

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      financeEditable,
      restaurant: user.restaurant ?? null,
      courier: user.courier ?? null,
    };
  }
}
