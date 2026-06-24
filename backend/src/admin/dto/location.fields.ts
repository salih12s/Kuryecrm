import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Shared fixed-location fields for restaurant create/update DTOs. */
export class LocationFields {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Enlem sayısal olmalıdır.' })
  @Min(-90, { message: 'Enlem -90 ile 90 arasında olmalıdır.' })
  @Max(90, { message: 'Enlem -90 ile 90 arasında olmalıdır.' })
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Boylam sayısal olmalıdır.' })
  @Min(-180, { message: 'Boylam -180 ile 180 arasında olmalıdır.' })
  @Max(180, { message: 'Boylam -180 ile 180 arasında olmalıdır.' })
  longitude?: number;

  @IsOptional()
  @IsString()
  locationNote?: string;
}
