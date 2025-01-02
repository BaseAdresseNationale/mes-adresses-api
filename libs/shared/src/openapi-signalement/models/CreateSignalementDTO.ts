/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuthorInput } from './AuthorInput';
import type { DeleteNumeroChangesRequestedDTO } from './DeleteNumeroChangesRequestedDTO';
import type { ExistingNumero } from './ExistingNumero';
import type { ExistingToponyme } from './ExistingToponyme';
import type { ExistingVoie } from './ExistingVoie';
import type { NumeroChangesRequestedDTO } from './NumeroChangesRequestedDTO';
import type { ToponymeChangesRequestedDTO } from './ToponymeChangesRequestedDTO';
import type { VoieChangesRequestedDTO } from './VoieChangesRequestedDTO';
export type CreateSignalementDTO = {
    codeCommune: string;
    type: CreateSignalementDTO.type;
    author?: AuthorInput | null;
    existingLocation?: (ExistingNumero | ExistingVoie | ExistingToponyme) | null;
    changesRequested: (NumeroChangesRequestedDTO | DeleteNumeroChangesRequestedDTO | ToponymeChangesRequestedDTO | VoieChangesRequestedDTO) | null;
};
export namespace CreateSignalementDTO {
    export enum type {
        LOCATION_TO_UPDATE = 'LOCATION_TO_UPDATE',
        LOCATION_TO_DELETE = 'LOCATION_TO_DELETE',
        LOCATION_TO_CREATE = 'LOCATION_TO_CREATE',
    }
}

