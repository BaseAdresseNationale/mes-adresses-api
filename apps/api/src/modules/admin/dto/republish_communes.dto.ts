import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsString } from 'class-validator';

export class RepublishCommunesDTO {
  @ApiProperty({ type: String, isArray: true, required: true })
  @ArrayNotEmpty()
  @IsString({ each: true })
  codesCommunes: string[];
}

export enum RepublishStatusEnum {
  PUBLISHED = 'published',
  UNCHANGED = 'unchanged',
  ERROR = 'error',
  NOT_FOUND = 'not_found',
}

export enum RepublishReportStatusEnum {
  RUNNING = 'running',
  DONE = 'done',
  FAILED = 'failed',
}

export class RepublishCommuneReportDTO {
  @ApiProperty()
  codeCommune: string;

  @ApiProperty({ required: false })
  balId?: string;

  @ApiProperty({ enum: RepublishStatusEnum })
  status: RepublishStatusEnum;

  @ApiProperty({ required: false })
  revisionId?: string;

  @ApiProperty({ required: false })
  error?: string;
}

export class RepublishCommunesReportDTO {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: RepublishReportStatusEnum })
  status: RepublishReportStatusEnum;

  @ApiProperty()
  startedAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  finishedAt?: Date;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty({ description: 'Nombre de communes demandées' })
  totalCommunes: number;

  @ApiProperty({ description: 'Nombre de communes traitées' })
  processedCommunes: number;

  @ApiProperty()
  published: number;

  @ApiProperty()
  unchanged: number;

  @ApiProperty()
  errors: number;

  @ApiProperty()
  notFound: number;

  @ApiProperty({ type: () => RepublishCommuneReportDTO, isArray: true })
  details: RepublishCommuneReportDTO[];
}
