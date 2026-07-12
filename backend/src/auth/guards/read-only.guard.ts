import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { AuthUser } from '../decorators/current-user.decorator';

/**
 * Blocks every non-GET request for the GOZLEMCI (restricted admin) role. Apply
 * after JwtAuthGuard + RolesGuard on any controller whose @Roles list includes
 * Role.GOZLEMCI, so that role only ever gets read access.
 */
@Injectable()
export class ReadOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (request.method === 'GET' || request.user?.role !== Role.GOZLEMCI) return true;
    throw new ForbiddenException('Gözlemci rolü salt okunurdur, işlem yapamaz.');
  }
}
