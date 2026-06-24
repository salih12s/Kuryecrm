import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { UpdateShiftStatusDto } from './dto/update-shift-status.dto';
import { ApproveTimeDto } from './dto/approve-time.dto';
import { ShiftQueryDto } from './dto/shift-query.dto';

@Controller('admin/shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
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
  create(@Body() dto: CreateShiftDto) {
    return this.shifts.adminCreate(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateShiftDto) {
    return this.shifts.adminUpdate(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateShiftStatusDto) {
    return this.shifts.adminSetStatus(id, dto.status);
  }

  @Patch(':id/approve-time')
  approveTime(@Param('id') id: string, @Body() dto: ApproveTimeDto) {
    return this.shifts.adminApproveTime(id, dto);
  }
}
