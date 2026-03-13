/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommuneSettingsDTO } from '../models/CommuneSettingsDTO';
import type { CommuneStatusDTO } from '../models/CommuneStatusDTO';
import type { EnabledListDTO } from '../models/EnabledListDTO';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SettingsService {
    /**
     * Get the submission status of the given commune
     * @param codeCommune
     * @param sourceId
     * @returns CommuneStatusDTO
     * @throws ApiError
     */
    public static getCommuneStatus(
        codeCommune: string,
        sourceId: string,
    ): CancelablePromise<CommuneStatusDTO> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/settings/commune-status/{codeCommune}',
            path: {
                'codeCommune': codeCommune,
            },
            query: {
                'sourceId': sourceId,
            },
        });
    }
    /**
     * Get the communes settings for the given codeCommune
     * @param codeCommune
     * @returns CommuneSettingsDTO
     * @throws ApiError
     */
    public static getCommuneSettings(
        codeCommune: string,
    ): CancelablePromise<CommuneSettingsDTO> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/settings/commune-settings/{codeCommune}',
            path: {
                'codeCommune': codeCommune,
            },
        });
    }
    /**
     * Delete commune settings for the given codeCommune
     * @param codeCommune
     * @returns boolean
     * @throws ApiError
     */
    public static deleteCommuneSettings(
        codeCommune: string,
    ): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/settings/commune-settings/{codeCommune}',
            path: {
                'codeCommune': codeCommune,
            },
        });
    }
    /**
     * Set the communes settings for the given codeCommune
     * @param codeCommune
     * @param requestBody
     * @returns CommuneSettingsDTO
     * @throws ApiError
     */
    public static setCommuneSettings(
        codeCommune: string,
        requestBody: CommuneSettingsDTO,
    ): CancelablePromise<CommuneSettingsDTO> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/settings/commune-settings/{codeCommune}',
            path: {
                'codeCommune': codeCommune,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Check if the given id is in the enabled list for the given listKey
     * @param listKey
     * @param id
     * @returns boolean
     * @throws ApiError
     */
    public static isInEnabledList(
        listKey: string,
        id: string,
    ): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/settings/enabled-list/{listKey}/{id}',
            path: {
                'listKey': listKey,
                'id': id,
            },
        });
    }
    /**
     * Update the enabled list for the given listKey
     * @param listKey
     * @param requestBody
     * @returns any[]
     * @throws ApiError
     */
    public static updateEnabledList(
        listKey: string,
        requestBody: EnabledListDTO,
    ): CancelablePromise<any[]> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/settings/enabled-list/{listKey}',
            path: {
                'listKey': listKey,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
