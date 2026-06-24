import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TURKISH_MOBILE_PHONE_MESSAGE, TURKISH_MOBILE_PHONE_REGEX } from '../../common/phone.util';
import { LocationFields } from './location.fields';

/**
 * All fields optional for editing. Password is optional: when omitted/empty
 * the existing password is kept; when provided it is re-hashed.
 */
export class UpdateRestaurantDto extends LocationFields {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Restoran adı boş olamaz.' })
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Yetkili kişi boş olamaz.' })
  authorizedPerson?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Telefon boş olamaz.' })
  @Matches(TURKISH_MOBILE_PHONE_REGEX, { message: TURKISH_MOBILE_PHONE_MESSAGE })
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Saatlik ücret sayısal olmalıdır.' })
  @Min(0, { message: 'Saatlik ücret negatif olamaz.' })
  hourlyRate?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Kullanıcı adı boş olamaz.' })
  username?: string;

  // Optional on update. Empty string is treated as "no change" in the service.
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Şifre boş olamaz.' })
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
