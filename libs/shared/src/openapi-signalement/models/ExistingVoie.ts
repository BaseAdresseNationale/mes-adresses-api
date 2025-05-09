/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Position } from './Position';
export type ExistingVoie = {
    type: ExistingVoie.type;
    banId?: string | null;
    nom: string;
    position?: Position | null;
};
export namespace ExistingVoie {
    export enum type {
        NUMERO = 'NUMERO',
        VOIE = 'VOIE',
        TOPONYME = 'TOPONYME',
    }
}

