import { IsOptional, Matches } from 'class-validator';
import { TIME_REGEX } from './create-shift.dto';

/**
 * Used by both restaurant and courier to report their own start/end.
 * At least one of the two must be provided (enforced in the service).
 */
export class ReportTimeDto {
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'Başlangıç saati HH:mm formatında olmalıdır.' })
  reportedStartTime?: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'Bitiş saati HH:mm formatında olmalıdır.' })
  reportedEndTime?: string;
}
