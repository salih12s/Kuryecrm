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

/**
 * All fields optional for editing. Password optional: empty => keep existing,
 * provided => re-hash.
 */
export class UpdateCourierDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Kurye adı boş olamaz.' })
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Telefon boş olamaz.' })
  @Matches(TURKISH_MOBILE_PHONE_REGEX, { message: TURKISH_MOBILE_PHONE_MESSAGE })
  phone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Saatlik ücret sayısal olmalıdır.' })
  @Min(0, { message: 'Saatlik ücret negatif olamaz.' })
  hourlyRate?: number;

  @IsOptional()
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır.' })
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
