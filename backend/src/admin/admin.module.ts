import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRestaurantsController } from './restaurants/admin-restaurants.controller';
import { AdminRestaurantsService } from './restaurants/admin-restaurants.service';
import { AdminCouriersController } from './couriers/admin-couriers.controller';
import { AdminCouriersService } from './couriers/admin-couriers.service';

@Module({
  controllers: [AdminController, AdminRestaurantsController, AdminCouriersController],
  providers: [AdminService, AdminRestaurantsService, AdminCouriersService],
})
export class AdminModule {}
