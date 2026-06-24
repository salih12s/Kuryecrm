import { IsOptional, IsString, Matches } from 'class-validator';
import { DATE_REGEX, TIME_REGEX } from './create-shift.dto';

/**
 * Admin shift edit. All fields optional. restaurantId/courierId may be changed
 * (re-snapshots the hourly rates in the service). Times keep HH:mm format.
 */
export class UpdateShiftDto {
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @IsOptional()
  @IsString()
  courierId?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Tarih YYYY-MM-DD formatında olmalıdır.' })
  date?: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'Planlanan başlangıç saati HH:mm formatında olmalıdır.' })
  plannedStartTime?: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'Planlanan bitiş saati HH:mm formatında olmalıdır.' })
  plannedEndTime?: string;

  // Empty string clears an extra time; otherwise strict HH:mm is required.
  @IsOptional()
  @Matches(/^$|^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Ekstra başlangıç saati HH:mm formatında olmalıdır.' })
  extraStartTime?: string;

  @IsOptional()
  @Matches(/^$|^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Ekstra bitiş saati HH:mm formatında olmalıdır.' })
  extraEndTime?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
