/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MissingAddressContext } from './MissingAddressContext';
export type UpdateAlertDTO = {
    status: UpdateAlertDTO.status;
    context?: MissingAddressContext | null;
    rejectionReason?: string;
};
export namespace UpdateAlertDTO {
    export enum status {
        PENDING = 'PENDING',
        IGNORED = 'IGNORED',
        PROCESSED = 'PROCESSED',
        EXPIRED = 'EXPIRED',
    }
}

