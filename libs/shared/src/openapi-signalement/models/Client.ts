/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Report } from './Report';
export type Client = {
    id: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    nom: string;
    processedReports?: Array<Report> | null;
};

