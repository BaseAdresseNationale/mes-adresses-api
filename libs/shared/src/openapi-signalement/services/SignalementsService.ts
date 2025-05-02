/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateSignalementDTO } from '../models/CreateSignalementDTO';
import type { PaginatedSignalementsDTO } from '../models/PaginatedSignalementsDTO';
import type { Signalement } from '../models/Signalement';
import type { UpdateSignalementDTO } from '../models/UpdateSignalementDTO';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SignalementsService {
    /**
     * Get signalements
     * @param limit
     * @param page
     * @param status
     * @param types
     * @param sourceIds
     * @param codeCommunes
     * @returns PaginatedSignalementsDTO
     * @throws ApiError
     */
    public static getSignalements(
        limit?: number,
        page?: number,
        status?: Array<'PENDING' | 'IGNORED' | 'PROCESSED' | 'EXPIRED'>,
        types?: Array<'LOCATION_TO_UPDATE' | 'LOCATION_TO_DELETE' | 'LOCATION_TO_CREATE'>,
        sourceIds?: Array<string>,
        codeCommunes?: Array<string>,
    ): CancelablePromise<PaginatedSignalementsDTO> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/signalements',
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
     * Create a new signalement
     * @param requestBody
     * @param sourceId
     * @returns Signalement
     * @throws ApiError
     */
    public static createSignalement(
        requestBody: CreateSignalementDTO,
        sourceId?: string,
    ): CancelablePromise<Signalement> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/signalements',
            query: {
                'sourceId': sourceId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get tiles (with signalements features)
     * @param status
     * @param z
     * @param x
     * @param y
     * @returns any
     * @throws ApiError
     */
    public static getTiles(
        status: string,
        z: string,
        x: string,
        y: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/signalements/tiles/{z}/{x}/{y}.pbf',
            path: {
                'z': z,
                'x': x,
                'y': y,
            },
            query: {
                'status': status,
            },
        });
    }
    /**
     * Get signalement by id
     * Get a signalement by its id, returns author info if client is authenticated
     * @param idSignalement
     * @returns Signalement
     * @throws ApiError
     */
    public static getSignalementById(
        idSignalement: string,
    ): CancelablePromise<Signalement> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/signalements/{idSignalement}',
            path: {
                'idSignalement': idSignalement,
            },
        });
    }
    /**
     * Update a given signalement
     * @param idSignalement
     * @param requestBody
     * @returns Signalement
     * @throws ApiError
     */
    public static updateSignalement(
        idSignalement: string,
        requestBody: UpdateSignalementDTO,
    ): CancelablePromise<Signalement> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/signalements/{idSignalement}',
            path: {
                'idSignalement': idSignalement,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
