import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { FinanceTransactionsService } from '../finance-transactions.service';
import {
  CreateFinanceTransactionDto,
  UpdateFinanceTransactionDto,
  UpdateFinanceTransactionStatusDto,
  FinanceTransactionQueryDto,
} from '../dto/finance-transaction.dto';

@Controller('admin/finance-transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminFinanceTransactionsController {
  constructor(private readonly service: FinanceTransactionsService) {}

  @Get()
  findAll(@Query() q: FinanceTransactionQueryDto) {
    return this.service.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFinanceTransactionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFinanceTransactionDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateFinanceTransactionStatusDto) {
    return this.service.setStatus(id, dto.status);
  }
}
