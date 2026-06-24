import { IsOptional, IsString, Matches } from 'class-validator';
import { TIME_REGEX } from './create-shift.dto';

/** Admin sets the final approved start/end. Money math will use these. */
export class ApproveTimeDto {
  @Matches(TIME_REGEX, { message: 'Onaylı başlangıç saati HH:mm formatında olmalıdır.' })
  approvedStartTime: string;

  @Matches(TIME_REGEX, { message: 'Onaylı bitiş saati HH:mm formatında olmalıdır.' })
  approvedEndTime: string;

  @IsOptional()
  @IsString()
  adminNote?: string;
}
