import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReadOnlyGuard } from '../auth/guards/read-only.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

// Application settings are admin-only to change. Gözlemci (restricted admin)
// can view them but not update, via ReadOnlyGuard.
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard, ReadOnlyGuard)
@Roles(Role.ADMIN, Role.GOZLEMCI)
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  getAll() {
    return this.settings.getAll();
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    const values: Record<string, string> = {};
    if (dto.courier_location_interval_seconds !== undefined)
      values.courier_location_interval_seconds = String(dto.courier_location_interval_seconds);
    if (dto.courier_offline_threshold_seconds !== undefined)
      values.courier_offline_threshold_seconds = String(dto.courier_offline_threshold_seconds);
    if (dto.partners_can_edit_finance !== undefined)
      values.partners_can_edit_finance = dto.partners_can_edit_finance;
    return this.settings.setMany(values);
  }
}
