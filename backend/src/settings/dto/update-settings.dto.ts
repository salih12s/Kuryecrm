import { IsBooleanString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Konum gönderim aralığı tam sayı olmalıdır.' })
  @Min(5, { message: 'Konum gönderim aralığı en az 5 saniye olmalıdır.' })
  @Max(600, { message: 'Konum gönderim aralığı en fazla 600 saniye olabilir.' })
  courier_location_interval_seconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Çevrim dışı eşiği tam sayı olmalıdır.' })
  @Min(15, { message: 'Çevrim dışı eşiği en az 15 saniye olmalıdır.' })
  @Max(1800, { message: 'Çevrim dışı eşiği en fazla 1800 saniye olabilir.' })
  courier_offline_threshold_seconds?: number;

  @IsOptional()
  @IsBooleanString({ message: 'Ortak finans düzenleme değeri true/false olmalıdır.' })
  partners_can_edit_finance?: string;
}
