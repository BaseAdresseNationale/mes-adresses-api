export type ValidationRevision = {
  valid?: boolean;
  validatorVersion?: string;
  errors?: string[];
  warnings?: string[];
  infos?: string[];
  rowsCount?: number;
};

export type ContextRevision = {
  nomComplet: string;
  organisation: string;
  extras: any;
};

export enum StatusRevision {
  PENDING = 'pending',
  PUBLISHED = 'published',
}

export type Revision = {
  _id: string;
  codeCommune: string;
  context?: ContextRevision;
  validation?: ValidationRevision;
  client: string;
  status: StatusRevision;
  ready: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  current: boolean;
};
