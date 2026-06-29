import { Module } from '@nestjs/common';
import { MotorcyclesService } from './motorcycles.service';
import { AccessoriesService } from './accessories.service';
import { AdminMotorcyclesController } from './controllers/admin-motorcycles.controller';
import { AdminAccessoriesController } from './controllers/admin-accessories.controller';
import { FinanceWriteGuard } from '../finance/guards/finance-write.guard';

// Stock (Phase 6): motorcycle asset register + accessory (bag / chest bag)
// purchase-sale tracking with profit. Gated like finance — admins always,
// partners by the `partners_can_edit_finance` setting (FinanceWriteGuard).
@Module({
  controllers: [AdminMotorcyclesController, AdminAccessoriesController],
  providers: [MotorcyclesService, AccessoriesService, FinanceWriteGuard],
})
export class StockModule {}
