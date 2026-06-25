import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ShiftsService } from './shifts.service';
import { ConfirmTimeDto } from './dto/confirm-time.dto';
import { PartyShiftQueryDto } from './dto/shift-query.dto';

// Restaurants view the shifts of couriers working at them and confirm each
// courier's live clock-in/out. They cannot create or freely edit shift times;
// shift management and final time approval stay with admin / Kurye Şefi.
@Controller('restaurant/shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT)
export class RestaurantShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  // Declared before ':id' so it is not captured as a shift id.
  @Get('pending-count')
  pendingCount(@CurrentUser() user: AuthUser) {
    return this.shifts.restaurantPendingCount(user.userId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: PartyShiftQueryDto) {
    return this.shifts.restaurantFindAll(user.userId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.shifts.restaurantFindOne(user.userId, id);
  }

  @Patch(':id/confirm-start')
  confirmStart(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ConfirmTimeDto,
  ) {
    return this.shifts.restaurantConfirmStart(user.userId, id, dto);
  }

  @Patch(':id/confirm-end')
  confirmEnd(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ConfirmTimeDto,
  ) {
    return this.shifts.restaurantConfirmEnd(user.userId, id, dto);
  }
}
