import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ReadOnlyGuard } from '../../auth/guards/read-only.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminApprovalsService } from './admin-approvals.service';
import { ApprovalDecisionDto } from '../dto/approval-decision.dto';

// Approval queue is admin-only (decisions). Kurye Şefi cannot self-approve.
// Gözlemci (restricted admin) can see the queue but not decide.
@Controller('admin/approvals')
@UseGuards(JwtAuthGuard, RolesGuard, ReadOnlyGuard)
@Roles(Role.ADMIN, Role.GOZLEMCI)
export class AdminApprovalsController {
  constructor(private readonly service: AdminApprovalsService) {}

  @Get()
  listPending() {
    return this.service.listPending();
  }

  @Patch('couriers/:id')
  decideCourier(@Param('id') id: string, @Body() dto: ApprovalDecisionDto) {
    return this.service.decideCourier(id, dto);
  }

  @Patch('restaurants/:id')
  decideRestaurant(@Param('id') id: string, @Body() dto: ApprovalDecisionDto) {
    return this.service.decideRestaurant(id, dto);
  }
}
