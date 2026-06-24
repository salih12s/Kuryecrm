import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ShiftsService } from './shifts.service';
import { ReportTimeDto } from './dto/report-time.dto';
import { PartyShiftQueryDto } from './dto/shift-query.dto';

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

  @Patch(':id/report-time')
  reportTime(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReportTimeDto,
  ) {
    return this.shifts.restaurantReportTime(user.userId, id, dto);
  }
}
