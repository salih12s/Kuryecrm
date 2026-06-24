import { IsEnum } from 'class-validator';
import { ShiftStatus } from '@prisma/client';

export class UpdateShiftStatusDto {
  @IsEnum(ShiftStatus, { message: 'Geçersiz vardiya durumu.' })
  status: ShiftStatus;
}
