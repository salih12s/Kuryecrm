import { BadRequestException } from '@nestjs/common';
import { Matches } from 'class-validator';

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class DailyReportQueryDto {
  @Matches(DATE_REGEX, { message: 'Tarih YYYY-MM-DD formatında olmalıdır.' })
  date: string;
}

export class RangeReportQueryDto {
  @Matches(DATE_REGEX, { message: 'Başlangıç tarihi YYYY-MM-DD formatında olmalıdır.' })
  startDate: string;

  @Matches(DATE_REGEX, { message: 'Bitiş tarihi YYYY-MM-DD formatında olmalıdır.' })
  endDate: string;
}

export function assertDateRange(startDate: string, endDate: string) {
  if (endDate < startDate) {
    throw new BadRequestException('Bitiş tarihi başlangıç tarihinden önce olamaz.');
  }
}
