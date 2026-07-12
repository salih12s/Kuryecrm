import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { CourierModule } from './courier/courier.module';
import { ShiftsModule } from './shifts/shifts.module';
import { FinanceModule } from './finance/finance.module';
import { ReportsModule } from './reports/reports.module';
import { StockModule } from './stock/stock.module';
import { SettingsModule } from './settings/settings.module';
import { TrackingModule } from './tracking/tracking.module';
import { MarketingModule } from './marketing/marketing.module';
import { AppController } from './app.controller';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Loads backend/.env (produced by set-local-env.bat / set-production-env.bat).
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    SettingsModule,
    AuthModule,
    AdminModule,
    RestaurantModule,
    CourierModule,
    ShiftsModule,
    FinanceModule,
    ReportsModule,
    StockModule,
    TrackingModule,
    MarketingModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
