/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Report } from './Report';
export type Source = {
    id: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    nom: string;
    type: Source.type;
    reports?: Array<Report> | null;
};
export namespace Source {
    export enum type {
        PUBLIC = 'PUBLIC',
        PRIVATE = 'PRIVATE',
    }
}

