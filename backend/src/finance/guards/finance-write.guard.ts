import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { AuthUser } from '../../auth/decorators/current-user.decorator';
import { SettingsService } from '../../settings/settings.service';

/**
 * Gates write access to finance endpoints. Read (GET) is always allowed for the
 * roles permitted by RolesGuard (admin + partner). For writes:
 *  - ADMIN can always write.
 *  - PARTNER can write only when `partners_can_edit_finance` is enabled.
 *  - Any other role is rejected.
 * Apply at class level together with @Roles(ADMIN, PARTNER).
 */
@Injectable()
export class FinanceWriteGuard implements CanActivate {
  constructor(private readonly settings: SettingsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (request.method === 'GET') return true;

    const role = request.user?.role;
    if (role === Role.ADMIN) return true;

    if (role === Role.PARTNER) {
      const canEdit = await this.settings.getBool('partners_can_edit_finance');
      if (canEdit) return true;
      throw new ForbiddenException('Ortak rolü için finansal düzenleme yetkisi kapalı.');
    }

    throw new ForbiddenException('Bu işlem için yetkiniz yok.');
  }
}
