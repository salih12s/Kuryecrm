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
import { PaymentStatus } from '@prisma/client';
import { DATE_REGEX } from './advance.dto';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Restoran seçimi zorunludur.' })
  restaurantId: string;

  // Optional link to a specific invoice; when set, that invoice's status is recomputed.
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @Matches(DATE_REGEX, { message: 'Ödeme tarihi YYYY-MM-DD formatında olmalıdır.' })
  paymentDate: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Tutar sayısal olmalıdır.' })
  @IsPositive({ message: 'Tutar 0’dan büyük olmalıdır.' })
  amount: number;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdatePaymentDto {
  // Allow re-linking / unlinking from an invoice. Empty string clears the link.
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Ödeme tarihi YYYY-MM-DD formatında olmalıdır.' })
  paymentDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tutar sayısal olmalıdır.' })
  @IsPositive({ message: 'Tutar 0’dan büyük olmalıdır.' })
  amount?: number;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus, { message: 'Geçersiz ödeme durumu.' })
  status: PaymentStatus;
}

export class PaymentQueryDto {
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
  @IsEnum(PaymentStatus, { message: 'Geçersiz ödeme durumu.' })
  status?: PaymentStatus;
}
