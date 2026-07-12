import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { FinanceWriteGuard } from '../../finance/guards/finance-write.guard';
import { MotorcyclesService } from '../motorcycles.service';
import {
  CreateMotorcycleDto,
  MotorcycleQueryDto,
  UpdateMotorcycleDto,
} from '../dto/motorcycle.dto';

@Controller('admin/motorcycles')
@UseGuards(JwtAuthGuard, RolesGuard, FinanceWriteGuard)
@Roles(Role.ADMIN, Role.PARTNER, Role.GOZLEMCI)
export class AdminMotorcyclesController {
  constructor(private readonly service: MotorcyclesService) {}

  @Get()
  findAll(@Query() q: MotorcycleQueryDto) {
    return this.service.findAll(q);
  }

  @Get('summary')
  summary() {
    return this.service.summary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMotorcycleDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMotorcycleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
