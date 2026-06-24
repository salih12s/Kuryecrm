import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdvanceStatus } from '@prisma/client';

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateAdvanceDto {
  @IsString()
  @IsNotEmpty({ message: 'Kurye seçimi zorunludur.' })
  courierId: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Tutar sayısal olmalıdır.' })
  @IsPositive({ message: 'Tutar 0’dan büyük olmalıdır.' })
  amount: number;

  @Matches(DATE_REGEX, { message: 'Avans tarihi YYYY-MM-DD formatında olmalıdır.' })
  advanceDate: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateAdvanceDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tutar sayısal olmalıdır.' })
  @IsPositive({ message: 'Tutar 0’dan büyük olmalıdır.' })
  amount?: number;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Avans tarihi YYYY-MM-DD formatında olmalıdır.' })
  advanceDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateAdvanceStatusDto {
  @IsEnum(AdvanceStatus, { message: 'Geçersiz avans durumu.' })
  status: AdvanceStatus;
}

export class AdvanceQueryDto {
  @IsOptional()
  @IsString()
  courierId?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dateFrom YYYY-MM-DD formatında olmalıdır.' })
  dateFrom?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dateTo YYYY-MM-DD formatında olmalıdır.' })
  dateTo?: string;

  @IsOptional()
  @IsEnum(AdvanceStatus, { message: 'Geçersiz avans durumu.' })
  status?: AdvanceStatus;
}
