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
import { AccessoriesService } from '../accessories.service';
import {
  AccessoryQueryDto,
  CreateAccessoryPurchaseDto,
  CreateAccessorySaleDto,
  UpdateAccessoryPurchaseDto,
  UpdateAccessorySaleDto,
} from '../dto/accessory.dto';

@Controller('admin/accessories')
@UseGuards(JwtAuthGuard, RolesGuard, FinanceWriteGuard)
@Roles(Role.ADMIN, Role.PARTNER)
export class AdminAccessoriesController {
  constructor(private readonly service: AccessoriesService) {}

  @Get('summary')
  summary(@Query() q: AccessoryQueryDto) {
    return this.service.summary(q);
  }

  // Distinct named products with current stock, for the sale form autocomplete.
  @Get('products')
  products() {
    return this.service.products();
  }

  // ---- Purchases ----
  @Get('purchases')
  listPurchases(@Query() q: AccessoryQueryDto) {
    return this.service.listPurchases(q);
  }

  @Post('purchases')
  createPurchase(@Body() dto: CreateAccessoryPurchaseDto) {
    return this.service.createPurchase(dto);
  }

  @Patch('purchases/:id')
  updatePurchase(@Param('id') id: string, @Body() dto: UpdateAccessoryPurchaseDto) {
    return this.service.updatePurchase(id, dto);
  }

  @Delete('purchases/:id')
  removePurchase(@Param('id') id: string) {
    return this.service.removePurchase(id);
  }

  // ---- Sales ----
  @Get('sales')
  listSales(@Query() q: AccessoryQueryDto) {
    return this.service.listSales(q);
  }

  @Post('sales')
  createSale(@Body() dto: CreateAccessorySaleDto) {
    return this.service.createSale(dto);
  }

  @Patch('sales/:id')
  updateSale(@Param('id') id: string, @Body() dto: UpdateAccessorySaleDto) {
    return this.service.updateSale(id, dto);
  }

  @Delete('sales/:id')
  removeSale(@Param('id') id: string) {
    return this.service.removeSale(id);
  }
}
