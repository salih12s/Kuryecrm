import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TURKISH_MOBILE_PHONE_MESSAGE, TURKISH_MOBILE_PHONE_REGEX } from '../../common/phone.util';

export class CreateCourierDto {
  @IsString()
  @IsNotEmpty({ message: 'Kurye adı zorunludur.' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Telefon zorunludur.' })
  @Matches(TURKISH_MOBILE_PHONE_REGEX, { message: TURKISH_MOBILE_PHONE_MESSAGE })
  phone: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Saatlik ücret sayısal olmalıdır.' })
  @Min(0, { message: 'Saatlik ücret negatif olamaz.' })
  hourlyRate: number;

  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır.' })
  password: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
