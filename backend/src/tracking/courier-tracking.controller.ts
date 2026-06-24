import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { TrackingService } from './tracking.service';
import { RecordLocationDto } from './dto/record-location.dto';

@Controller('courier')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.COURIER)
export class CourierTrackingController {
  constructor(private readonly tracking: TrackingService) {}

  /** Tells the client whether to track now and at what interval. */
  @Get('tracking-status')
  status(@CurrentUser() user: AuthUser) {
    return this.tracking.trackingStatus(user.userId);
  }

  /** Accepts a GPS ping; rejected (403) when there is no active shift. */
  @Post('location')
  record(@CurrentUser() user: AuthUser, @Body() dto: RecordLocationDto) {
    return this.tracking.recordLocation(user.userId, dto);
  }
}
