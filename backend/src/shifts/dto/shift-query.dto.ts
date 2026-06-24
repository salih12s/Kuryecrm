import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ShiftStatus } from '@prisma/client';
import { DATE_REGEX } from './create-shift.dto';

/** Filters for the admin shift list (restaurant/courier use a subset). */
export class ShiftQueryDto {
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dateFrom YYYY-MM-DD formatında olmalıdır.' })
  dateFrom?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dateTo YYYY-MM-DD formatında olmalıdır.' })
  dateTo?: string;

  @IsOptional()
  @IsString()
  restaurantId?: string;

  @IsOptional()
  @IsString()
  courierId?: string;

  @IsOptional()
  @IsEnum(ShiftStatus, { message: 'Geçersiz vardiya durumu.' })
  status?: ShiftStatus;
}

/**
 * Restaurant/courier self-service lists must never accept profile identifiers.
 * Ownership is resolved exclusively from the authenticated user on the server.
 */
export class PartyShiftQueryDto {
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dateFrom YYYY-MM-DD formatında olmalıdır.' })
  dateFrom?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dateTo YYYY-MM-DD formatında olmalıdır.' })
  dateTo?: string;

  @IsOptional()
  @IsEnum(ShiftStatus, { message: 'Geçersiz vardiya durumu.' })
  status?: ShiftStatus;
}
