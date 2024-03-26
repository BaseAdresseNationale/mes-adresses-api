import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsString } from 'class-validator';

export class CodeCommuneDTO {
  @ApiProperty({ required: true, nullable: false })
  @ArrayNotEmpty()
  @IsString({ each: true })
  codeCommunes: Array<string>;
}
