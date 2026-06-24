import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Matches } from 'class-validator';
import { CourierPaymentStatus } from '@prisma/client';
import { DATE_REGEX } from './advance.dto';

export class CreateCourierPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Kurye seçimi zorunludur.' })
  courierId: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Tutar sayısal olmalıdır.' })
  @IsPositive({ message: 'Tutar 0’dan büyük olmalıdır.' })
  amount: number;

  @Matches(DATE_REGEX, { message: 'Ödeme tarihi YYYY-MM-DD formatında olmalıdır.' })
  paymentDate: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateCourierPaymentDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tutar sayısal olmalıdır.' })
  @IsPositive({ message: 'Tutar 0’dan büyük olmalıdır.' })
  amount?: number;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Ödeme tarihi YYYY-MM-DD formatında olmalıdır.' })
  paymentDate?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateCourierPaymentStatusDto {
  @IsEnum(CourierPaymentStatus, { message: 'Geçersiz ödeme durumu.' })
  status: CourierPaymentStatus;
}

export class CourierPaymentQueryDto {
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
  @IsEnum(CourierPaymentStatus, { message: 'Geçersiz ödeme durumu.' })
  status?: CourierPaymentStatus;
}
