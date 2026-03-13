/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TilesService {
    /**
     * Get vector tiles with alerts and/or signalements features
     * @param z
     * @param x
     * @param y
     * @param status Filter by status
     * @param layers Layers to include in the tiles (defaults to both alerts and signalements)
     * @returns any PBF vector tile with requested layers
     * @throws ApiError
     */
    public static getTiles(
        z: string,
        x: string,
        y: string,
        status?: 'PENDING' | 'IGNORED' | 'PROCESSED' | 'EXPIRED',
        layers?: Array<'alerts' | 'signalements'>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tiles/{z}/{x}/{y}.pbf',
            path: {
                'z': z,
                'x': x,
                'y': y,
            },
            query: {
                'status': status,
                'layers': layers,
            },
        });
    }
}
