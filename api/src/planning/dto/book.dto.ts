import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class BookDto {
  @ApiProperty({ description: 'Identifiant du créneau réservable (MissionSlot)' })
  @IsString()
  @Length(1, 64)
  missionSlotId!: string;
}
