import { Module } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { CourierTrackingController } from './courier-tracking.controller';
import { LiveMapController } from './live-map.controller';

@Module({
  controllers: [CourierTrackingController, LiveMapController],
  providers: [TrackingService],
})
export class TrackingModule {}
