import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  MaxLength,
  Validate,
  IsOptional,
  ValidateNested,
  ArrayNotEmpty,
  IsMongoId,
  Max,
  Min,
  IsInt,
} from 'class-validator';

import { Position } from '@/shared/entities/position.entity';
import { ValidatorBal } from '@/shared/validators/validator_bal.validator';
import { ValidatorCogCommune } from '@/shared/validators/cog.validator';

export class UpdateNumeroDTO {
  @IsOptional()
  @IsInt({ message: 'numero:Le champ numéro doit être un entier' })
  @Min(0, { message: 'numero:Le champ numéro doit être 0 au minimum' })
  @Max(99998, { message: 'numero:Le champ numéro doit être inférieur à 99998' })
  @ApiProperty({ required: false, nullable: false })
  numero?: number;

  @IsOptional()
  @Validate(ValidatorBal, ['suffixe'])
  @ApiProperty({ required: false, nullable: true })
  suffixe?: string;

  @IsOptional()
  @MaxLength(5000, {
    message: 'comment:Le champ ne peut pas dépasser 5000 caractères',
  })
  @ApiProperty({ required: false, nullable: true })
  comment?: string;

  @IsOptional()
  @IsMongoId()
  @ApiProperty({ type: String, required: false, nullable: true })
  toponymeId?: string;

  @IsOptional()
  @IsMongoId()
  @ApiProperty({ type: String, required: false, nullable: false })
  voieId?: string;

  @IsOptional()
  @Validate(ValidatorBal, ['cad_parcelles'])
  @ApiProperty({ required: false, nullable: false })
  parcelles?: string[];

  @IsOptional()
  @ApiProperty({ required: false, nullable: false })
  certifie?: boolean;

  @IsOptional()
  @Validate(ValidatorCogCommune, ['commune_deleguee'])
  @ApiProperty({ required: false, nullable: false })
  communeDeleguee?: string | null;

  @IsOptional()
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
