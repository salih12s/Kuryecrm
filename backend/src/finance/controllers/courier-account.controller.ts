import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../auth/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingService } from '../accounting.service';
import { AdvancesService } from '../advances.service';
import { CourierPaymentsService } from '../courier-payments.service';

@Controller('courier')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.COURIER)
export class CourierAccountController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingService,
    private readonly advances: AdvancesService,
    private readonly payments: CourierPaymentsService,
  ) {}

  /** Resolves the courier owned by the logged-in user. */
  private async ownCourierId(userId: string): Promise<string> {
    const courier = await this.prisma.courier.findUnique({ where: { userId } });
    if (!courier) throw new NotFoundException('Bu hesaba bağlı kurye kaydı bulunamadı.');
    return courier.id;
  }

  @Get('account-summary')
  async accountSummary(@CurrentUser() user: AuthUser) {
    return this.accounting.courierSummary(await this.ownCourierId(user.userId));
  }

  @Get('advances')
  async advanceList(@CurrentUser() user: AuthUser) {
    return this.advances.findAll({ courierId: await this.ownCourierId(user.userId) });
  }

  @Get('payments')
  async paymentList(@CurrentUser() user: AuthUser) {
    return this.payments.findAll({ courierId: await this.ownCourierId(user.userId) });
  }
}
