import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@salon-danse.fr' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin2027!' })
  @IsString()
  password!: string;
}
