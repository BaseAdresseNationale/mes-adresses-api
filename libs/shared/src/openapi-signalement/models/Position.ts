/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Point } from './Point';
export type Position = {
    point: Point;
    type: Position.type;
};
export namespace Position {
    export enum type {
        ENTR_E = 'entrée',
        B_TIMENT = 'bâtiment',
        CAGE_D_ESCALIER = 'cage d’escalier',
        LOGEMENT = 'logement',
        SERVICE_TECHNIQUE = 'service technique',
        D_LIVRANCE_POSTALE = 'délivrance postale',
        PARCELLE = 'parcelle',
        SEGMENT = 'segment',
    }
}

