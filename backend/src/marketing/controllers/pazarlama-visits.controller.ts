import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../auth/decorators/current-user.decorator';
import { MarketingService } from '../marketing.service';
import { CreateVisitDto, UpdateVisitDto, VisitQueryDto } from '../dto/visit.dto';

// Marketer self-service: every read/write is scoped to the caller's own rows,
// so a Pazarlamacı can never see another marketer's visit log.
@Controller('pazarlama/visits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PAZARLAMACI)
export class PazarlamaVisitsController {
  constructor(private readonly service: MarketingService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() q: VisitQueryDto) {
    return this.service.findAll(q, user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(id, user.userId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVisitDto) {
    return this.service.create(dto, user.userId);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateVisitDto) {
    return this.service.update(id, dto, user.userId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(id, user.userId);
  }
}
