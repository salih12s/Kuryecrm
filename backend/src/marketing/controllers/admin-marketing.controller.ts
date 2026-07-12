import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ReadOnlyGuard } from '../../auth/guards/read-only.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { MarketingService } from '../marketing.service';
import { UpdateVisitDto, VisitQueryDto } from '../dto/visit.dto';

// Admin sees every marketer's visit log (optionally filtered by userId) and
// can correct/remove entries. Gözlemci (restricted admin) is read-only here.
@Controller('admin/marketing/visits')
@UseGuards(JwtAuthGuard, RolesGuard, ReadOnlyGuard)
@Roles(Role.ADMIN, Role.GOZLEMCI)
export class AdminMarketingController {
  constructor(private readonly service: MarketingService) {}

  @Get()
  findAll(@Query() q: VisitQueryDto) {
    return this.service.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateVisitDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
