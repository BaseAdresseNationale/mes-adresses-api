import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsNotEmpty } from 'class-validator';

export class CreateBaseLocaleDTO {
  @IsNotEmpty()
  @ApiProperty({ required: true, nullable: false })
  nom: string;

  @ApiProperty({ required: true, nullable: false })
  @ArrayNotEmpty()
  emails: Array<string>;

  @ApiProperty({ required: true, nullable: false })
  commune: string;
}
