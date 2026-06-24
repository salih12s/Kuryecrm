import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { FinanceWriteGuard } from '../guards/finance-write.guard';
import { InvoicesService } from '../invoices.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  UpdateInvoiceStatusDto,
  InvoiceQueryDto,
} from '../dto/invoice.dto';

@Controller('admin/restaurant-invoices')
@UseGuards(JwtAuthGuard, RolesGuard, FinanceWriteGuard)
@Roles(Role.ADMIN, Role.PARTNER)
export class AdminInvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  findAll(@Query() q: InvoiceQueryDto) {
    return this.service.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateInvoiceStatusDto) {
    return this.service.setStatus(id, dto.status);
  }
}
