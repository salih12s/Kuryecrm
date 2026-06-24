import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccountingService } from '../accounting.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminAccountsController {
  constructor(private readonly accounting: AccountingService) {}

  @Get('couriers/:id/account-summary')
  courierSummary(@Param('id') id: string) {
    return this.accounting.courierSummary(id);
  }

  @Get('restaurants/:id/account-summary')
  restaurantSummary(@Param('id') id: string) {
    return this.accounting.restaurantSummary(id);
  }

  // Backing list for the admin "Restoran Cari" page.
  @Get('restaurant-accounts')
  restaurantAccounts() {
    return this.accounting.restaurantAccountsList();
  }
}
