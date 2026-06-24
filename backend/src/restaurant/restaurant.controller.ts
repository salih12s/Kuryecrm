import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { RestaurantService } from './restaurant.service';

@Controller('restaurant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT)
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    // The service scopes data to THIS user's restaurant only.
    return this.restaurantService.dashboard(user);
  }
}
