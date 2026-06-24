import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

// "HH:mm" 24h, zero-padded. Lexicographic compare also works for ordering.
export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateShiftDto {
  @IsString()
  @IsNotEmpty({ message: 'Restoran seçimi zorunludur.' })
  restaurantId: string;

  @IsString()
  @IsNotEmpty({ message: 'Kurye seçimi zorunludur.' })
  courierId: string;

  @Matches(DATE_REGEX, { message: 'Tarih YYYY-MM-DD formatında olmalıdır.' })
  date: string;

  @Matches(TIME_REGEX, { message: 'Planlanan başlangıç saati HH:mm formatında olmalıdır.' })
  plannedStartTime: string;

  @Matches(TIME_REGEX, { message: 'Planlanan bitiş saati HH:mm formatında olmalıdır.' })
  plannedEndTime: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'Ekstra başlangıç saati HH:mm formatında olmalıdır.' })
  extraStartTime?: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'Ekstra bitiş saati HH:mm formatında olmalıdır.' })
  extraEndTime?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
