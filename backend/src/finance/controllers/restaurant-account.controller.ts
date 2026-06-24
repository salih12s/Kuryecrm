import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../auth/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingService } from '../accounting.service';
import { InvoicesService } from '../invoices.service';
import { PaymentsService } from '../payments.service';

@Controller('restaurant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT)
export class RestaurantAccountController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingService,
    private readonly invoices: InvoicesService,
    private readonly payments: PaymentsService,
  ) {}

  /** Resolves the restaurant owned by the logged-in user. */
  private async ownRestaurantId(userId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { userId } });
    if (!restaurant) throw new NotFoundException('Bu hesaba bağlı restoran kaydı bulunamadı.');
    return restaurant.id;
  }

  @Get('account-summary')
  async accountSummary(@CurrentUser() user: AuthUser) {
    return this.accounting.restaurantSummary(await this.ownRestaurantId(user.userId));
  }

  @Get('invoices')
  async invoiceList(@CurrentUser() user: AuthUser) {
    return this.invoices.findAll({ restaurantId: await this.ownRestaurantId(user.userId) });
  }

  @Get('payments')
  async paymentList(@CurrentUser() user: AuthUser) {
    return this.payments.findAll({ restaurantId: await this.ownRestaurantId(user.userId) });
  }
}
