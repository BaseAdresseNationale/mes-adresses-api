import { ApiProperty } from '@nestjs/swagger';

export class GenerateCertificatDTO {
  @ApiProperty({ required: true, nullable: false })
  emetteur: string;

  @ApiProperty({ required: true, nullable: false })
  destinataire: string;
}
