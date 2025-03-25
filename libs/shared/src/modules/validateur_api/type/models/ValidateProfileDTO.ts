/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FieldDTO } from './FieldDTO';
import type { NotFoundFieldDTO } from './NotFoundFieldDTO';
import type { ParseErrorDTO } from './ParseErrorDTO';
import type { ProfileErrorDTO } from './ProfileErrorDTO';
import type { ProfilesValidationDTO } from './ProfilesValidationDTO';
import type { ValidateFileDTO } from './ValidateFileDTO';
import type { ValidateRowDTO } from './ValidateRowDTO';
export type ValidateProfileDTO = {
    encoding: string;
    linebreak: string;
    delimiter: string;
    originalFields: Array<string>;
    parseOk: boolean;
    parseErrors: Array<ParseErrorDTO>;
    parsedRows: Array<string>;
    fields: Array<FieldDTO>;
    notFoundFields: Array<NotFoundFieldDTO>;
    rows: Array<ValidateRowDTO>;
    fileValidation: ValidateFileDTO;
    profilesValidation: Record<string, ProfilesValidationDTO>;
    globalErrors: Array<string>;
    rowsErrors: Array<string>;
    uniqueErrors: Array<string>;
    profilErrors: Array<ProfileErrorDTO>;
};

