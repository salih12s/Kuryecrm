import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { CourierService } from './courier.service';

@Controller('courier')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.COURIER)
export class CourierController {
  constructor(private readonly courierService: CourierService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    // The service scopes data to THIS user's courier record only.
    return this.courierService.dashboard(user);
  }
}
