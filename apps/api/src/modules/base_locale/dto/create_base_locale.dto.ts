import { ValidatorCogCommune } from '@/shared/validators/cog.validator';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsEmail, IsNotEmpty, Validate } from 'class-validator';

export class CreateBaseLocaleDTO {
  @IsNotEmpty()
  @ApiProperty({ required: true, nullable: false })
  nom: string;

  @ApiProperty({ required: true, nullable: false })
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  emails: Array<string>;

  @ApiProperty({ required: true, nullable: false })
  @Validate(ValidatorCogCommune, ['commune'])
  commune: string;
}
