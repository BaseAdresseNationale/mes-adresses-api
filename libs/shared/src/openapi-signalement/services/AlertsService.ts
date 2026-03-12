/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Alert } from '../models/Alert';
import type { CreateAlertDTO } from '../models/CreateAlertDTO';
import type { PaginatedAlertsDTO } from '../models/PaginatedAlertsDTO';
import type { UpdateAlertDTO } from '../models/UpdateAlertDTO';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AlertsService {
    /**
     * Get alerts
     * @param limit
     * @param page
     * @param status
     * @param types
     * @param sourceIds
     * @param codeCommunes
     * @returns PaginatedAlertsDTO
     * @throws ApiError
     */
    public static getAlerts(
        limit?: number,
        page?: number,
        status?: Array<'PENDING' | 'IGNORED' | 'PROCESSED' | 'EXPIRED'>,
        types?: Array<'MISSING_ADDRESS'>,
        sourceIds?: Array<string>,
        codeCommunes?: Array<string>,
    ): CancelablePromise<PaginatedAlertsDTO> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/alerts',
            query: {
                'limit': limit,
                'page': page,
                'status': status,
                'types': types,
                'sourceIds': sourceIds,
                'codeCommunes': codeCommunes,
            },
        });
    }
    /**
     * Create a new alert
     * @param requestBody
     * @param sourceId
     * @returns Alert
     * @throws ApiError
     */
    public static createAlert(
        requestBody: CreateAlertDTO,
        sourceId?: string,
    ): CancelablePromise<Alert> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/alerts',
            query: {
                'sourceId': sourceId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get alert by id
     * Get an alert by its id, returns author info if client is authenticated
     * @param idAlert
     * @returns Alert
     * @throws ApiError
     */
    public static getAlertById(
        idAlert: string,
    ): CancelablePromise<Alert> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/alerts/{idAlert}',
            path: {
                'idAlert': idAlert,
            },
        });
    }
    /**
     * Update a given alert
     * @param idAlert
     * @param requestBody
     * @returns Alert
     * @throws ApiError
     */
    public static updateAlert(
        idAlert: string,
        requestBody: UpdateAlertDTO,
    ): CancelablePromise<Alert> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/alerts/{idAlert}',
            path: {
                'idAlert': idAlert,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
