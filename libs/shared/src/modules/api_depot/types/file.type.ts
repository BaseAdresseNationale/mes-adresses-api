export enum TypeFileEnum {
  BAL = 'bal',
}

export type File = {
  id?: string;
  revisionId?: string;
  size?: number;
  hash?: string;
  type?: TypeFileEnum;
  createdAt?: Date;
};
