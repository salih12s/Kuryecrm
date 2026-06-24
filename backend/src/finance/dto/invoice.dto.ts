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
import { InvoiceStatus } from '@prisma/client';
import { DATE_REGEX } from './advance.dto';

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty({ message: 'Restoran seçimi zorunludur.' })
  restaurantId: string;

  @IsOptional()
  @IsString()
  invoiceNo?: string;

  @Matches(DATE_REGEX, { message: 'Fatura tarihi YYYY-MM-DD formatında olmalıdır.' })
  invoiceDate: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Dönem başlangıcı YYYY-MM-DD formatında olmalıdır.' })
  periodStart?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Dönem bitişi YYYY-MM-DD formatında olmalıdır.' })
  periodEnd?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Tutar sayısal olmalıdır.' })
  @IsPositive({ message: 'Tutar 0’dan büyük olmalıdır.' })
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  invoiceNo?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Fatura tarihi YYYY-MM-DD formatında olmalıdır.' })
  invoiceDate?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Dönem başlangıcı YYYY-MM-DD formatında olmalıdır.' })
  periodStart?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Dönem bitişi YYYY-MM-DD formatında olmalıdır.' })
  periodEnd?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tutar sayısal olmalıdır.' })
  @IsPositive({ message: 'Tutar 0’dan büyük olmalıdır.' })
  amount?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateInvoiceStatusDto {
  @IsEnum(InvoiceStatus, { message: 'Geçersiz fatura durumu.' })
  status: InvoiceStatus;
}

export class InvoiceQueryDto {
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dateFrom YYYY-MM-DD formatında olmalıdır.' })
  dateFrom?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dateTo YYYY-MM-DD formatında olmalıdır.' })
  dateTo?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus, { message: 'Geçersiz fatura durumu.' })
  status?: InvoiceStatus;
}
