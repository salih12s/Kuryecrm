import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { DailyReportQueryDto, RangeReportQueryDto, assertDateRange } from './dto/report-query.dto';

// Financial reports are visible to admins and partners (read-only).
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.PARTNER)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  dashboard() {
    return this.reports.dashboard();
  }

  @Get('daily')
  daily(@Query() query: DailyReportQueryDto) {
    return this.reports.daily(query.date);
  }

  @Get('range')
  range(@Query() query: RangeReportQueryDto) {
    assertDateRange(query.startDate, query.endDate);
    return this.reports.range(query.startDate, query.endDate);
  }

  @Get('restaurants')
  restaurants(@Query() query: RangeReportQueryDto) {
    assertDateRange(query.startDate, query.endDate);
    return this.reports.restaurantReport(query.startDate, query.endDate);
  }

  @Get('couriers')
  couriers(@Query() query: RangeReportQueryDto) {
    assertDateRange(query.startDate, query.endDate);
    return this.reports.courierReport(query.startDate, query.endDate);
  }
}
