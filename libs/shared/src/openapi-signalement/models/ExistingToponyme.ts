/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Position } from './Position';
export type ExistingToponyme = {
    type: ExistingToponyme.type;
    banId?: string | null;
    nom: string;
    position: Position;
    parcelles?: Array<string> | null;
};
export namespace ExistingToponyme {
    export enum type {
        NUMERO = 'NUMERO',
        VOIE = 'VOIE',
        TOPONYME = 'TOPONYME',
    }
}

