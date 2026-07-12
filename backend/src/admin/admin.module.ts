import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRestaurantsController } from './restaurants/admin-restaurants.controller';
import { AdminRestaurantsService } from './restaurants/admin-restaurants.service';
import { AdminCouriersController } from './couriers/admin-couriers.controller';
import { AdminCouriersService } from './couriers/admin-couriers.service';
import { AdminApprovalsController } from './approvals/admin-approvals.controller';
import { AdminApprovalsService } from './approvals/admin-approvals.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { ShiftsModule } from '../shifts/shifts.module';

@Module({
  imports: [ShiftsModule],
  controllers: [
    AdminController,
    AdminRestaurantsController,
    AdminCouriersController,
    AdminApprovalsController,
    AdminUsersController,
  ],
  providers: [AdminService, AdminRestaurantsService, AdminCouriersService, AdminApprovalsService, AdminUsersService],
})
export class AdminModule {}
