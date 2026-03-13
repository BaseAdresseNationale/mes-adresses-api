/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PaginatedReportsDTO } from '../models/PaginatedReportsDTO';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ReportsService {
    /**
     * Get paginated alerts and/or signalements
     * @param limit
     * @param page
     * @param types Filter by specific type (MISSING_ADDRESS, LOCATION_TO_UPDATE, etc.)
     * @param status
     * @param sourceIds
     * @param codeCommunes
     * @returns PaginatedReportsDTO
     * @throws ApiError
     */
    public static getReports(
        limit?: number,
        page?: number,
        types?: Array<'MISSING_ADDRESS' | 'LOCATION_TO_UPDATE' | 'LOCATION_TO_DELETE' | 'LOCATION_TO_CREATE'>,
        status?: Array<'PENDING' | 'IGNORED' | 'PROCESSED' | 'EXPIRED'>,
        sourceIds?: Array<string>,
        codeCommunes?: Array<string>,
    ): CancelablePromise<PaginatedReportsDTO> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/reports',
            query: {
                'limit': limit,
                'page': page,
                'types': types,
                'status': status,
                'sourceIds': sourceIds,
                'codeCommunes': codeCommunes,
            },
        });
    }
}
