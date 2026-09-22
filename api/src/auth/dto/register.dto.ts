import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: '0485D341' })
  @IsString()
  @Length(4, 64)
  code!: string;

  @ApiProperty({ example: 'marie.dupont@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'MotDePasse123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères.' })
  password!: string;

  @ApiProperty({ example: 'Marie' })
  @IsString()
  @Length(1, 100)
  firstName!: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @Length(1, 100)
  lastName!: string;

  @ApiProperty({ example: '0612345678' })
  @IsString()
  @Matches(/^[0-9+ .()-]{6,20}$/, { message: 'Numéro de téléphone invalide.' })
  phone!: string;
}
