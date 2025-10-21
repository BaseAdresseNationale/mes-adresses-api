import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class GenerateCertificatDTO {
  @ApiProperty({ required: false })
  emetteur?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  destinataire?: string;
}
