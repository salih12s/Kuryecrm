import { Role } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Ad soyad boş olamaz.' })
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Kullanıcı adı boş olamaz.' })
  username?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Şifre boş olamaz.' })
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır.' })
  password?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
