import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** A single GPS ping sent by the courier's device. */
export class RecordLocationDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'Enlem sayısal olmalıdır.' })
  @Min(-90)
  @Max(90)
  latitude: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Boylam sayısal olmalıdır.' })
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  speed?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsString()
  deviceStatus?: string;

  @IsOptional()
  @IsString()
  connectionStatus?: string;

  /** Client-side capture time (ISO). Falls back to server time when absent. */
  @IsOptional()
  @IsString()
  recordedAt?: string;
}
