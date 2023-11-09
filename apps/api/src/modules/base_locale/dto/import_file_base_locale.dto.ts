import { ApiProperty } from '@nestjs/swagger';

export class ImportFileBaseLocaleDTO {
  @ApiProperty({ nullable: false })
  isValid: boolean;

  @ApiProperty({ nullable: false })
  accepted: boolean;

  @ApiProperty({ nullable: false })
  rejected: boolean;

  @ApiProperty({ nullable: false })
  commune: string;

  @ApiProperty({ nullable: false })
  voies: number;

  @ApiProperty({ nullable: false })
  numeros: number;
}
