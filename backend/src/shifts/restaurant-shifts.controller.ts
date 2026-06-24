import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ShiftsService } from './shifts.service';
import { PartyShiftQueryDto } from './dto/shift-query.dto';

// Read-only for restaurants: a restaurant can view the shifts of couriers
// working at it, but can no longer report or change any shift times. Time entry
// and shift management are handled only by admin / Kurye Şefi.
@Controller('restaurant/shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT)
export class RestaurantShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: PartyShiftQueryDto) {
    return this.shifts.restaurantFindAll(user.userId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.shifts.restaurantFindOne(user.userId, id);
  }
}
