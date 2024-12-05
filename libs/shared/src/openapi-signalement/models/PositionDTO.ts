/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PositionCoordinatesDTO } from './PositionCoordinatesDTO';
export type PositionDTO = {
    point: PositionCoordinatesDTO;
    type: PositionDTO.type;
};
export namespace PositionDTO {
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

