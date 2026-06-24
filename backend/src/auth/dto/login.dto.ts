import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Kullanıcı adı boş olamaz.' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Şifre boş olamaz.' })
  password: string;
}
