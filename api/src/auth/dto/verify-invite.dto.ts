import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyInviteDto {
  @ApiProperty({ example: '0485D341', description: "Code d'invitation reçu par e-mail" })
  @IsString()
  @Length(4, 64)
  code!: string;
}
