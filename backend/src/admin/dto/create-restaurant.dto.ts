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

export class CreateRestaurantDto extends LocationFields {
  @IsString()
  @IsNotEmpty({ message: 'Restoran adı zorunludur.' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Yetkili kişi zorunludur.' })
  authorizedPerson: string;

  @IsString()
  @IsNotEmpty({ message: 'Telefon zorunludur.' })
  @Matches(TURKISH_MOBILE_PHONE_REGEX, { message: TURKISH_MOBILE_PHONE_MESSAGE })
  phone: string;

  // Address is part of the form but may be left empty.
  @IsOptional()
  @IsString()
  address?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Saatlik ücret sayısal olmalıdır.' })
  @Min(0, { message: 'Saatlik ücret negatif olamaz.' })
  hourlyRate: number;

  @IsString()
  @IsNotEmpty({ message: 'Kullanıcı adı zorunludur.' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Şifre zorunludur.' })
  password: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
