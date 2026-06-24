import { Module } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { AdminShiftsController } from './admin-shifts.controller';
import { RestaurantShiftsController } from './restaurant-shifts.controller';
import { CourierShiftsController } from './courier-shifts.controller';

@Module({
  controllers: [AdminShiftsController, RestaurantShiftsController, CourierShiftsController],
  providers: [ShiftsService],
})
export class ShiftsModule {}
