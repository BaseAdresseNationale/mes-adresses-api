import { ApiProperty } from '@nestjs/swagger';

export class ImportFileBaseLocaleDTO {
  @ApiProperty({ nullable: false })
  isValid: boolean;

  @ApiProperty({ nullable: false })
  accepted: number;

  @ApiProperty({ nullable: false })
  rejected: number;

  @ApiProperty({ nullable: false })
  commune: string;

  @ApiProperty({ nullable: false })
  voies: number;

  @ApiProperty({ nullable: false })
  numeros: number;
}
