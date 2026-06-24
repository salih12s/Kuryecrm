import { Role } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Ad soyad zorunludur.' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Kullanıcı adı zorunludur.' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Şifre zorunludur.' })
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
