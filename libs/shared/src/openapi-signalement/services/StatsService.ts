/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SignalementStatsDTO } from '../models/SignalementStatsDTO';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StatsService {
    /**
     * Get stats
     * @returns SignalementStatsDTO
     * @throws ApiError
     */
    public static getStats(): CancelablePromise<SignalementStatsDTO> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/stats',
        });
    }
}
