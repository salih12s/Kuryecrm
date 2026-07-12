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
import { ReadOnlyGuard } from '../../auth/guards/read-only.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../auth/decorators/current-user.decorator';
import { AdminRestaurantsService } from './admin-restaurants.service';
import { CreateRestaurantDto } from '../dto/create-restaurant.dto';
import { UpdateRestaurantDto } from '../dto/update-restaurant.dto';
import { ListQueryDto } from '../dto/list-query.dto';

// Restaurants are managed by both admins and Kurye Şefi. Every new record
// starts pending and requires admin approval before it goes live (in service).
// Gözlemci (restricted admin) gets read-only access via ReadOnlyGuard. Müdür
// may only view and create (also lands pending, same as everyone else) — not
// edit an existing restaurant, so that route stays out of the class-level list.
@Controller('admin/restaurants')
@UseGuards(JwtAuthGuard, RolesGuard, ReadOnlyGuard)
@Roles(Role.ADMIN, Role.KURYE_SEFI, Role.GOZLEMCI, Role.MUDUR)
export class AdminRestaurantsController {
  constructor(private readonly service: AdminRestaurantsService) {}

  @Get()
  findAll(@Query() query: ListQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRestaurantDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.KURYE_SEFI, Role.GOZLEMCI)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateRestaurantDto) {
    return this.service.update(id, dto, user.role as Role);
  }

  // Permanent deletion is admin-only; Kurye Şefi cannot delete records.
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
