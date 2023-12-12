import { ValidatorCogCommune } from '@/shared/validators/cog.validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, Validate } from 'class-validator';

export class CreateDemoBaseLocaleDTO {
  @ApiProperty({ required: true, nullable: false })
  @Validate(ValidatorCogCommune, ['commune'])
  commune: string;

  @IsOptional()
  @ApiProperty({ required: false, nullable: true })
  populate?: boolean;
}
