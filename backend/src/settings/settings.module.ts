import { Global, Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AdminSettingsController } from './admin-settings.controller';

// Global so any module (finance guard, tracking) can inject SettingsService.
@Global()
@Module({
  controllers: [AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
