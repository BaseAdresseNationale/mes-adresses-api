/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Author } from './Author';
import type { Client } from './Client';
import type { Source } from './Source';
export type Report = {
    id: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    codeCommune: string;
    nomCommune?: string | null;
    type: Report.type;
    author?: Author | null;
    status: Report.status;
    point: Record<string, any>;
    source: Source;
    processedBy?: Client | null;
    reportKind: Report.reportKind;
};
export namespace Report {
    export enum type {
        MISSING_ADDRESS = 'MISSING_ADDRESS',
        LOCATION_TO_UPDATE = 'LOCATION_TO_UPDATE',
        LOCATION_TO_DELETE = 'LOCATION_TO_DELETE',
        LOCATION_TO_CREATE = 'LOCATION_TO_CREATE',
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

