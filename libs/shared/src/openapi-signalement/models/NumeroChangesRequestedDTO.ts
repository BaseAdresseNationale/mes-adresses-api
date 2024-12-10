/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PositionDTO } from './PositionDTO';
export type NumeroChangesRequestedDTO = {
    numero: number;
    suffixe?: string;
    nomVoie: string;
    nomComplement?: string;
    parcelles: Array<string>;
    positions: Array<PositionDTO>;
    comment?: string | null;
};

