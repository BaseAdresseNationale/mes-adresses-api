/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateSignalementDTO } from '../models/CreateSignalementDTO';
import type { Signalement } from '../models/Signalement';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
  /**
   * Get all signalements for a given codeCommune
   * @param codeCommune
   * @returns any[]
   * @throws ApiError
   */
  public static getSignalementsByCodeCommune(
    codeCommune: string,
  ): CancelablePromise<any[]> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/signalements/{codeCommune}',
      path: {
        codeCommune: codeCommune,
      },
    });
  }
  /**
   * Create a new signalement
   * @param requestBody
   * @returns Signalement
   * @throws ApiError
   */
  public static createBaseLocale(
    requestBody: CreateSignalementDTO,
  ): CancelablePromise<Signalement> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/signalements',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
}
