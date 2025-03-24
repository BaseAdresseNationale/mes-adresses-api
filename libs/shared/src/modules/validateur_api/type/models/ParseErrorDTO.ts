/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ParseErrorDTO = {
    type: ParseErrorDTO.type;
    code: ParseErrorDTO.code;
    message: string;
    row: number;
    index: number;
};
export namespace ParseErrorDTO {
    export enum type {
        QUOTES = 'Quotes',
        DELIMITER = 'Delimiter',
        FIELD_MISMATCH = 'FieldMismatch',
    }
    export enum code {
        MISSING_QUOTES = 'MissingQuotes',
        UNDETECTABLE_DELIMITER = 'UndetectableDelimiter',
        TOO_FEW_FIELDS = 'TooFewFields',
        TOO_MANY_FIELDS = 'TooManyFields',
        INVALID_QUOTES = 'InvalidQuotes',
    }
}

