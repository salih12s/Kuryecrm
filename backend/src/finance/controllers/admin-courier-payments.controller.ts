import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CourierPaymentsService } from '../courier-payments.service';
import {
  CourierPaymentQueryDto,
  CreateCourierPaymentDto,
  UpdateCourierPaymentDto,
  UpdateCourierPaymentStatusDto,
} from '../dto/courier-payment.dto';

@Controller('admin/courier-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminCourierPaymentsController {
  constructor(private readonly service: CourierPaymentsService) {}

  @Get()
  findAll(@Query() query: CourierPaymentQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCourierPaymentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCourierPaymentDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateCourierPaymentStatusDto) {
    return this.service.setStatus(id, dto.status);
  }
}
