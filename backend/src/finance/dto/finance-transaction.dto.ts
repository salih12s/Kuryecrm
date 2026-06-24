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
import { FinanceTransactionStatus, FinanceTransactionType } from '@prisma/client';
import { DATE_REGEX } from './advance.dto';

export class CreateFinanceTransactionDto {
  @IsEnum(FinanceTransactionType, { message: 'Tür INCOME veya EXPENSE olmalıdır.' })
  type: FinanceTransactionType;

  @IsString()
  @IsNotEmpty({ message: 'Başlık zorunludur.' })
  title: string;

  @IsOptional()
  @IsString()
  category?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Tutar sayısal olmalıdır.' })
  @IsPositive({ message: 'Tutar 0’dan büyük olmalıdır.' })
  amount: number;

  @Matches(DATE_REGEX, { message: 'Tarih YYYY-MM-DD formatında olmalıdır.' })
  transactionDate: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateFinanceTransactionDto {
  @IsOptional()
  @IsEnum(FinanceTransactionType, { message: 'Tür INCOME veya EXPENSE olmalıdır.' })
  type?: FinanceTransactionType;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Başlık boş olamaz.' })
  title?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tutar sayısal olmalıdır.' })
  @IsPositive({ message: 'Tutar 0’dan büyük olmalıdır.' })
  amount?: number;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Tarih YYYY-MM-DD formatında olmalıdır.' })
  transactionDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateFinanceTransactionStatusDto {
  @IsEnum(FinanceTransactionStatus, { message: 'Geçersiz durum.' })
  status: FinanceTransactionStatus;
}

export class FinanceTransactionQueryDto {
  @IsOptional()
  @IsEnum(FinanceTransactionType, { message: 'Tür INCOME veya EXPENSE olmalıdır.' })
  type?: FinanceTransactionType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dateFrom YYYY-MM-DD formatında olmalıdır.' })
  dateFrom?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dateTo YYYY-MM-DD formatında olmalıdır.' })
  dateTo?: string;

  @IsOptional()
  @IsEnum(FinanceTransactionStatus, { message: 'Geçersiz durum.' })
  status?: FinanceTransactionStatus;
}
