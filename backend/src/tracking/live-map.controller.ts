import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReadOnlyGuard } from '../auth/guards/read-only.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TrackingService } from './tracking.service';

// Live map is an operations tool: admins and Kurye Şefi only. Partners and
// restaurants cannot see courier locations. Gözlemci (restricted admin) can
// view it read-only (this controller is GET-only already, guard is a backstop).
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, ReadOnlyGuard)
@Roles(Role.ADMIN, Role.KURYE_SEFI, Role.GOZLEMCI)
export class LiveMapController {
  constructor(private readonly tracking: TrackingService) {}

  @Get('live-map')
  liveMap() {
    return this.tracking.liveMap();
  }

  @Get('shifts/:id/locations')
  shiftLocations(@Param('id') id: string) {
    return this.tracking.shiftLocations(id);
  }
}
