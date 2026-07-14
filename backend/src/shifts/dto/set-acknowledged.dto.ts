import { IsBoolean, IsOptional, Matches } from 'class-validator';
import { TIME_REGEX } from './create-shift.dto';

/** Courier's own informational plan acknowledgment (independent of hour approval). */
export class SetAcknowledgedDto {
  @IsBoolean()
  acknowledged: boolean;

  // The courier's local "HH:mm" tap time, sent only when acknowledging (true).
  // Used solely to derive an informational "acknowledged late" flag.
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'Saat HH:mm formatında olmalıdır.' })
  ackTime?: string;
}
