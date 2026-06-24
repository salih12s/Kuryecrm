import { IsIn, IsOptional, IsString } from 'class-validator';

/** Admin decision on a pending courier/restaurant created by a Kurye Şefi. */
export class ApprovalDecisionDto {
  @IsIn(['approve', 'reject'], { message: 'Geçerli bir işlem seçiniz (approve/reject).' })
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  note?: string;
}
