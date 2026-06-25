import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ShiftsService } from './shifts.service';
import { ReportTimeDto } from './dto/report-time.dto';
import { PartyShiftQueryDto } from './dto/shift-query.dto';

@Controller('courier/shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.COURIER)
export class CourierShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  // Declared before ':id' so it is not captured as a shift id.
  @Get('waiting-count')
  waitingCount(@CurrentUser() user: AuthUser) {
    return this.shifts.courierWaitingCount(user.userId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: PartyShiftQueryDto) {
    return this.shifts.courierFindAll(user.userId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.shifts.courierFindOne(user.userId, id);
  }

  @Patch(':id/report-time')
  reportTime(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReportTimeDto,
  ) {
    return this.shifts.courierReportTime(user.userId, id, dto);
  }
}
