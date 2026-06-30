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
import { MotorcycleStatus } from '@prisma/client';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateMotorcycleDto {
  @IsString()
  @IsNotEmpty({ message: 'Marka/model zorunludur.' })
  brand: string;

  @IsOptional()
  @IsString()
  plate?: string;

  @Matches(DATE_REGEX, { message: 'Alış tarihi YYYY-MM-DD formatında olmalıdır.' })
  purchaseDate: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Alış fiyatı sayısal olmalıdır.' })
  @IsPositive({ message: 'Alış fiyatı 0’dan büyük olmalıdır.' })
  purchasePrice: number;

  @IsOptional()
  @IsEnum(MotorcycleStatus, { message: 'Geçersiz motor durumu.' })
  status?: MotorcycleStatus;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Satış tarihi YYYY-MM-DD formatında olmalıdır.' })
  saleDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Satış fiyatı sayısal olmalıdır.' })
  @IsPositive({ message: 'Satış fiyatı 0’dan büyük olmalıdır.' })
  salePrice?: number;

  @IsOptional()
  @IsString()
  buyer?: string;

  @IsOptional()
  @IsString()
  buyerCourierId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateMotorcycleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Marka/model boş olamaz.' })
  brand?: string;

  @IsOptional()
  @IsString()
  plate?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Alış tarihi YYYY-MM-DD formatında olmalıdır.' })
  purchaseDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Alış fiyatı sayısal olmalıdır.' })
  @IsPositive({ message: 'Alış fiyatı 0’dan büyük olmalıdır.' })
  purchasePrice?: number;

  @IsOptional()
  @IsEnum(MotorcycleStatus, { message: 'Geçersiz motor durumu.' })
  status?: MotorcycleStatus;

  // Nullable: send "" to clear the sale fields (e.g. when reverting to stock).
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Satış tarihi YYYY-MM-DD formatında olmalıdır.' })
  saleDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Satış fiyatı sayısal olmalıdır.' })
  @IsPositive({ message: 'Satış fiyatı 0’dan büyük olmalıdır.' })
  salePrice?: number;

  @IsOptional()
  @IsString()
  buyer?: string;

  @IsOptional()
  @IsString()
  buyerCourierId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class MotorcycleQueryDto {
  @IsOptional()
  @IsEnum(MotorcycleStatus, { message: 'Geçersiz motor durumu.' })
  status?: MotorcycleStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
