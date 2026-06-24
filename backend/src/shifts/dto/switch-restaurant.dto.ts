import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { TIME_REGEX } from './create-shift.dto';

/**
 * Moves a courier to a different restaurant in the middle of an active shift.
 * The current open work interval is closed at `switchTime` and a new interval
 * at `newRestaurantId` is opened from that time.
 */
export class SwitchRestaurantDto {
  @IsString()
  @IsNotEmpty({ message: 'Yeni restoran seçimi zorunludur.' })
  newRestaurantId: string;

  @Matches(TIME_REGEX, { message: 'Geçiş saati HH:mm formatında olmalıdır.' })
  switchTime: string;
}
