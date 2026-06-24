import { Module } from '@nestjs/common';
import { AdvancesService } from './advances.service';
import { InvoicesService } from './invoices.service';
import { PaymentsService } from './payments.service';
import { FinanceTransactionsService } from './finance-transactions.service';
import { AccountingService } from './accounting.service';
import { AdminAdvancesController } from './controllers/admin-advances.controller';
import { AdminInvoicesController } from './controllers/admin-invoices.controller';
import { AdminPaymentsController } from './controllers/admin-payments.controller';
import { AdminFinanceTransactionsController } from './controllers/admin-finance-transactions.controller';
import { AdminAccountsController } from './controllers/admin-accounts.controller';
import { RestaurantAccountController } from './controllers/restaurant-account.controller';
import { CourierAccountController } from './controllers/courier-account.controller';
import { CourierPaymentsService } from './courier-payments.service';
import { AdminCourierPaymentsController } from './controllers/admin-courier-payments.controller';

@Module({
  controllers: [
    AdminAdvancesController,
    AdminInvoicesController,
    AdminPaymentsController,
    AdminFinanceTransactionsController,
    AdminAccountsController,
    RestaurantAccountController,
    CourierAccountController,
    AdminCourierPaymentsController,
  ],
  providers: [
    AdvancesService,
    InvoicesService,
    PaymentsService,
    FinanceTransactionsService,
    AccountingService,
    CourierPaymentsService,
  ],
})
export class FinanceModule {}
