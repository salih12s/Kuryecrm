import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Mevcut şifre boş olamaz.' })
  currentPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Yeni şifre boş olamaz.' })
  @MinLength(6, { message: 'Yeni şifre en az 6 karakter olmalıdır.' })
  newPassword: string;
}
