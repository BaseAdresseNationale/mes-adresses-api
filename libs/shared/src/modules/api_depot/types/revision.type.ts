import { File } from './file.type';
import { Habilitation } from './habilitation.type';
import { ParseError } from './validator.types';

export enum StatusRevisionEnum {
  PENDING = 'pending',
  PUBLISHED = 'published',
}

export type Validation = {
  valid: boolean;
  validatorVersion?: string;
  parseErrors?: ParseError[];
  errors?: string[];
  warnings?: string[];
  infos?: string[];
  rowsCount?: number;
};

export type Context = {
  nomComplet?: string;
  organisation?: string;
  extras?: Record<string, any> | null;
};

export type Revision = {
  id?: string;
  clientId?: string;
  codeCommune: string;
  ready: boolean;
  current: boolean;
  status: StatusRevisionEnum;
  context?: Context;
  validation?: Validation | null;
  habilitation?: Habilitation | null;
  publishedAt?: Date;
  files?: File[];
  createdAt: Date;
  updatedAt: Date;
};
