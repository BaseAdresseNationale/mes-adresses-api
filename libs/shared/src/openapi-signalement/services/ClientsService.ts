/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Client } from '../models/Client';
import type { CreateClientDTO } from '../models/CreateClientDTO';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ClientsService {
    /**
     * Create a new Client
     * @param requestBody
     * @returns Client
     * @throws ApiError
     */
    public static createClient(
        requestBody: CreateClientDTO,
    ): CancelablePromise<Client> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/clients',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
