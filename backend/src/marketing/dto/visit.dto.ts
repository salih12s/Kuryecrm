import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Matches, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { VisitResult } from '@prisma/client';

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateVisitDto {
  @Matches(DATE_REGEX, { message: 'Tarih YYYY-MM-DD formatında olmalıdır.' })
  visitDate: string;

  @IsString()
  @MaxLength(200)
  placeName: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsEnum(VisitResult, { message: 'Sonuç POSITIVE veya NEGATIVE olmalıdır.' })
  result: VisitResult;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Operasyon kişi sayısı tam sayı olmalıdır.' })
  @IsPositive({ message: 'Operasyon kişi sayısı 0’dan büyük olmalıdır.' })
  operationSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  negativeReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateVisitDto {
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Tarih YYYY-MM-DD formatında olmalıdır.' })
  visitDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEnum(VisitResult, { message: 'Sonuç POSITIVE veya NEGATIVE olmalıdır.' })
  result?: VisitResult;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Operasyon kişi sayısı tam sayı olmalıdır.' })
  @IsPositive({ message: 'Operasyon kişi sayısı 0’dan büyük olmalıdır.' })
  operationSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  negativeReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class VisitQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dateFrom YYYY-MM-DD formatında olmalıdır.' })
  dateFrom?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dateTo YYYY-MM-DD formatında olmalıdır.' })
  dateTo?: string;

  @IsOptional()
  @IsEnum(VisitResult, { message: 'Geçersiz sonuç.' })
  result?: VisitResult;
}
