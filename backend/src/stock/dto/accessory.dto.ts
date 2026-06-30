import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccessoryType } from '@prisma/client';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ---------------- Purchases ----------------
export class CreateAccessoryPurchaseDto {
  @IsEnum(AccessoryType, { message: 'Geçersiz aksesuar türü.' })
  type: AccessoryType;

  @IsOptional()
  @IsString()
  name?: string;

  @Type(() => Number)
  @IsInt({ message: 'Adet tam sayı olmalıdır.' })
  @Min(1, { message: 'Adet en az 1 olmalıdır.' })
  quantity: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Birim alış fiyatı sayısal olmalıdır.' })
  @IsPositive({ message: 'Birim alış fiyatı 0’dan büyük olmalıdır.' })
  unitCost: number;

  @Matches(DATE_REGEX, { message: 'Alış tarihi YYYY-MM-DD formatında olmalıdır.' })
  purchaseDate: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateAccessoryPurchaseDto {
  @IsOptional()
  @IsEnum(AccessoryType, { message: 'Geçersiz aksesuar türü.' })
  type?: AccessoryType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Adet tam sayı olmalıdır.' })
  @Min(1, { message: 'Adet en az 1 olmalıdır.' })
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Birim alış fiyatı sayısal olmalıdır.' })
  @IsPositive({ message: 'Birim alış fiyatı 0’dan büyük olmalıdır.' })
  unitCost?: number;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Alış tarihi YYYY-MM-DD formatında olmalıdır.' })
  purchaseDate?: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

// ---------------- Sales ----------------
export class CreateAccessorySaleDto {
  @IsEnum(AccessoryType, { message: 'Geçersiz aksesuar türü.' })
  type: AccessoryType;

  @IsOptional()
  @IsString()
  name?: string;

  @Type(() => Number)
  @IsInt({ message: 'Adet tam sayı olmalıdır.' })
  @Min(1, { message: 'Adet en az 1 olmalıdır.' })
  quantity: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Birim satış fiyatı sayısal olmalıdır.' })
  @IsPositive({ message: 'Birim satış fiyatı 0’dan büyük olmalıdır.' })
  unitPrice: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Birim alış (maliyet) fiyatı sayısal olmalıdır.' })
  @IsPositive({ message: 'Birim alış (maliyet) fiyatı 0’dan büyük olmalıdır.' })
  unitCost: number;

  @Matches(DATE_REGEX, { message: 'Satış tarihi YYYY-MM-DD formatında olmalıdır.' })
  saleDate: string;

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

export class UpdateAccessorySaleDto {
  @IsOptional()
  @IsEnum(AccessoryType, { message: 'Geçersiz aksesuar türü.' })
  type?: AccessoryType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Adet tam sayı olmalıdır.' })
  @Min(1, { message: 'Adet en az 1 olmalıdır.' })
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Birim satış fiyatı sayısal olmalıdır.' })
  @IsPositive({ message: 'Birim satış fiyatı 0’dan büyük olmalıdır.' })
  unitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Birim alış (maliyet) fiyatı sayısal olmalıdır.' })
  @IsPositive({ message: 'Birim alış (maliyet) fiyatı 0’dan büyük olmalıdır.' })
  unitCost?: number;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Satış tarihi YYYY-MM-DD formatında olmalıdır.' })
  saleDate?: string;

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

// ---------------- Queries ----------------
export class AccessoryQueryDto {
  @IsOptional()
  @IsEnum(AccessoryType, { message: 'Geçersiz aksesuar türü.' })
  type?: AccessoryType;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dateFrom YYYY-MM-DD formatında olmalıdır.' })
  dateFrom?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dateTo YYYY-MM-DD formatında olmalıdır.' })
  dateTo?: string;
}
