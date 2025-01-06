/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExistingToponyme } from './ExistingToponyme';
import type { ExistingVoie } from './ExistingVoie';
import type { Position } from './Position';
export type ExistingNumero = {
    type: ExistingNumero.type;
    banId?: string | null;
    numero: number;
    suffixe: string;
    position: Position;
    parcelles?: Array<string> | null;
    toponyme: (ExistingVoie | ExistingToponyme);
    nomComplement?: string;
};
export namespace ExistingNumero {
    export enum type {
        NUMERO = 'NUMERO',
        VOIE = 'VOIE',
        TOPONYME = 'TOPONYME',
    }
}

