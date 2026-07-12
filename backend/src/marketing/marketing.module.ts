import { Module } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { PazarlamaVisitsController } from './controllers/pazarlama-visits.controller';
import { AdminMarketingController } from './controllers/admin-marketing.controller';

@Module({
  controllers: [PazarlamaVisitsController, AdminMarketingController],
  providers: [MarketingService],
})
export class MarketingModule {}
