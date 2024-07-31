export enum LevelEnum {
  INFO = 'I',
  WARNING = 'W',
  ERROR = 'E',
}

export interface Field {
  name: string;
  schemaName: string;
}

export interface FieldNotFound {
  schemaVersion: string;
  schemaName: string;
  level: LevelEnum;
}

export interface Row {
  rawValues: any;
  parsedValues: any;
  additionalValues: any;
  localizedValues: any;
  errors: any[];
  line: number;
  isValid: boolean;
}

export interface FieldFileValidation {
  value: string;
  isValid: boolean;
}

export interface FileValidation {
  encoding: FieldFileValidation;
  delimiter: FieldFileValidation;
  linebreak: FieldFileValidation;
}
export interface ProfileValidation {
  code: string;
  name: string;
  isValid: boolean;
}

export interface ProfileError {
  code: string;
  level: LevelEnum;
}

export interface ParseError {
  type: string;
  code: string;
  message: string;
  row: number;
}

export interface ValidationBal {
  encoding: string;
  linebreak: string;
  delimiter: string;
  originalFields: string[];
  parseOk: boolean;
  parseErrors: ParseError[];
  fields: Field[];
  notFoundFields: FieldNotFound[];
  rows: Row[];
  fileValidation: FileValidation;
  profilesValidation: Record<string, ProfileValidation>;
  globalErrors: string[];
  rowsErrors: string[];
  uniqueErrors: string[];
  profilErrors: ProfileError[];
}
