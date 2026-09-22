import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateIdentityDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(3, 20) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isMinor?: boolean;
}

export class AssignDto {
  @IsString() @Length(1, 64) missionSlotId!: string;
}
