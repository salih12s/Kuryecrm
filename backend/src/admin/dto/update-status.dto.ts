import { IsBoolean } from 'class-validator';

export class UpdateStatusDto {
  @IsBoolean({ message: 'isActive boolean olmalıdır.' })
  isActive: boolean;
}
