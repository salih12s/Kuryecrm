import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReadOnlyGuard } from '../auth/guards/read-only.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { UpdateShiftStatusDto } from './dto/update-shift-status.dto';
import { ApproveTimeDto } from './dto/approve-time.dto';
import { SwitchRestaurantDto } from './dto/switch-restaurant.dto';
import { ShiftQueryDto } from './dto/shift-query.dto';

// Operational shift management is available to admins and Kurye Şefi.
// Gözlemci (restricted admin) gets read-only access via ReadOnlyGuard. Müdür
// can view/create/edit like Kurye Şefi, but create/edit land as a pending
// request (see create()/update() below) instead of applying immediately.
@Controller('admin/shifts')
@UseGuards(JwtAuthGuard, RolesGuard, ReadOnlyGuard)
@Roles(Role.ADMIN, Role.KURYE_SEFI, Role.GOZLEMCI, Role.MUDUR)
export class AdminShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Get()
  findAll(@Query() query: ShiftQueryDto) {
    return this.shifts.adminFindAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shifts.adminFindOne(id);
  }

  @Post()
  create(@Body() dto: CreateShiftDto, @CurrentUser() user: AuthUser) {
    if (user.role === Role.MUDUR) return this.shifts.requestShiftCreate(dto, user.userId);
    return this.shifts.adminCreate(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateShiftDto, @CurrentUser() user: AuthUser) {
    if (user.role === Role.MUDUR) return this.shifts.requestShiftUpdate(id, dto, user.userId);
    return this.shifts.adminUpdate(id, dto);
  }

  // Finalizing actions stay out of Müdür's reach entirely (not even as a
  // pending request): status changes, time approval (feeds accounting) and
  // mid-shift restaurant switches.
  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.KURYE_SEFI, Role.GOZLEMCI)
  setStatus(@Param('id') id: string, @Body() dto: UpdateShiftStatusDto) {
    return this.shifts.adminSetStatus(id, dto.status);
  }

  @Patch(':id/approve-time')
  @Roles(Role.ADMIN, Role.KURYE_SEFI, Role.GOZLEMCI)
  approveTime(@Param('id') id: string, @Body() dto: ApproveTimeDto) {
    return this.shifts.adminApproveTime(id, dto);
  }

  @Patch(':id/switch-restaurant')
  @Roles(Role.ADMIN, Role.KURYE_SEFI, Role.GOZLEMCI)
  switchRestaurant(@Param('id') id: string, @Body() dto: SwitchRestaurantDto) {
    return this.shifts.adminSwitchRestaurant(id, dto);
  }

  // Permanent deletion (for shifts entered by mistake) is admin-only; Kurye
  // Şefi can only cancel via /:id/status.
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.shifts.adminDelete(id);
  }
}
