import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { FinanceWriteGuard } from '../guards/finance-write.guard';
import { AdvancesService } from '../advances.service';
import {
  CreateAdvanceDto,
  UpdateAdvanceDto,
  UpdateAdvanceStatusDto,
  AdvanceQueryDto,
} from '../dto/advance.dto';

@Controller('admin/advances')
@UseGuards(JwtAuthGuard, RolesGuard, FinanceWriteGuard)
@Roles(Role.ADMIN, Role.PARTNER)
export class AdminAdvancesController {
  constructor(private readonly service: AdvancesService) {}

  @Get()
  findAll(@Query() q: AdvanceQueryDto) {
    return this.service.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAdvanceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdvanceDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateAdvanceStatusDto) {
    return this.service.setStatus(id, dto.status);
  }
}
