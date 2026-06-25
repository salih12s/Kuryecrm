import { Role } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Ad soyad zorunludur.' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Kullanıcı adı zorunludur.' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Şifre zorunludur.' })
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır.' })
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
