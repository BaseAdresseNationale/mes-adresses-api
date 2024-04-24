import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CodeCommuneDTO {
  @ApiProperty({ required: true, nullable: false })
  @IsOptional()
  @IsString({ each: true })
  codeCommunes: Array<string>;
}
