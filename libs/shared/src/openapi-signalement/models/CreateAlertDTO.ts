/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuthorInput } from './AuthorInput';
import type { MissingAddressContext } from './MissingAddressContext';
import type { PositionCoordinatesDTO } from './PositionCoordinatesDTO';
export type CreateAlertDTO = {
    codeCommune: string;
    type: CreateAlertDTO.type;
    point: PositionCoordinatesDTO;
    comment: string;
    author?: AuthorInput | null;
    context?: MissingAddressContext | null;
};
export namespace CreateAlertDTO {
    export enum type {
        MISSING_ADDRESS = 'MISSING_ADDRESS',
    }
}

