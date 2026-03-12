/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CombinedStatsDTO } from '../models/CombinedStatsDTO';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StatsService {
    /**
     * Get stats
     * @returns CombinedStatsDTO
     * @throws ApiError
     */
    public static getStats(): CancelablePromise<CombinedStatsDTO> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/stats',
        });
    }
}
