import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Validate,
  IsOptional,
  ValidateNested,
  IsNotEmptyObject,
  ArrayNotEmpty,
} from 'class-validator';
import { ValidatorBal } from '@/shared/validators/validator_bal.validator';
import { Position } from '@/lib/schemas/position.schema';

export class UpdateToponymeDto {
  @IsOptional()
  @Validate(ValidatorBal, ['nom_voie'])
  @ApiProperty({ required: false, nullable: false })
  nom: string;

  @IsOptional()
  @IsNotEmptyObject()
  @Validate(ValidatorBal, ['nom_alt_voie'])
  @ApiProperty({ required: false, nullable: true })
  nomAlt: Record<string, string>;

  @IsOptional()
  @Validate(ValidatorBal, ['cad_parcelles'])
  @ApiProperty({ required: false, nullable: true })
  parcelles?: string[];

  @ValidateNested({ each: true, message: 'positions must be an array' })
  @ArrayNotEmpty()
  @Type(() => Position)
  @ApiProperty({
    type: () => Position,
    isArray: true,
    required: false,
    nullable: false,
  })
  positions?: Position[];
}
