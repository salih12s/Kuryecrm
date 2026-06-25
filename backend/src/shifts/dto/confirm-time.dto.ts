import { IsOptional, Matches } from 'class-validator';
import { TIME_REGEX } from './create-shift.dto';

/**
 * Restaurant confirmation of a courier's live clock-in/out. When `reportedTime`
 * is omitted the courier's stamped time is accepted as-is; providing a different
 * time records the restaurant's correction (which becomes a dispute on mismatch).
 */
export class ConfirmTimeDto {
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'Saat HH:mm formatında olmalıdır.' })
  reportedTime?: string;
}
