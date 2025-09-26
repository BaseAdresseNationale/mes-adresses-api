import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class GenerateCertificatDTO {
  @ApiProperty({ required: true, nullable: false })
  emetteur: string;

  @ApiProperty({ required: true, nullable: true })
  @IsOptional()
  destinataire?: string;
}
