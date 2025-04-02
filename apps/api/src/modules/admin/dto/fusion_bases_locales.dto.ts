import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
  IsEmail,
} from 'class-validator';

export class CommuneBalDTO {
  @ApiProperty({ required: true, nullable: false })
  @IsString()
  codeCommune: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsMongoId()
  @IsString()
  balId?: string;
}

export class FusionCommunesDTO {
  @ApiProperty({ required: true, nullable: false })
  @IsString()
  codeCommune: string;

  @ApiProperty({ required: true, nullable: false })
  @IsString()
  nom: string;

  @ApiProperty({ required: true, nullable: false })
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  emails: string[];

  @ApiProperty({
    type: () => CommuneBalDTO,
    isArray: true,
    required: false,
    nullable: false,
  })
  @ValidateNested({ each: true })
  @ArrayNotEmpty()
  @Type(() => CommuneBalDTO)
  communes: CommuneBalDTO[];
}
