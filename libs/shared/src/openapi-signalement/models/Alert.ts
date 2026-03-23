/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Author } from './Author';
import type { Client } from './Client';
import type { MissingAddressContext } from './MissingAddressContext';
import type { Source } from './Source';
export type Alert = {
    id: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    codeCommune: string;
    nomCommune?: string | null;
    type: Alert.type;
    author?: Author | null;
    status: Alert.status;
    point: Record<string, any>;
    source: Source;
    processedBy?: Client | null;
    reportKind: Alert.reportKind;
    comment: string;
    context?: MissingAddressContext | null;
};
export namespace Alert {
    export enum type {
        MISSING_ADDRESS = 'MISSING_ADDRESS',
    }
    export enum status {
        PENDING = 'PENDING',
        IGNORED = 'IGNORED',
        PROCESSED = 'PROCESSED',
        EXPIRED = 'EXPIRED',
    }
    export enum reportKind {
        ALERT = 'alert',
        SIGNALEMENT = 'signalement',
    }
}

