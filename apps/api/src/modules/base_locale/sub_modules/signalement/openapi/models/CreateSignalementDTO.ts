/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuthorDTO } from './AuthorDTO';
import type { ChangesRequestedDTO } from './ChangesRequestedDTO';
import type { ExistingLocation } from './ExistingLocation';
export type CreateSignalementDTO = {
    codeCommune: string;
    type: string;
    author?: AuthorDTO | null;
    existingLocation?: ExistingLocation | null;
    changesRequested: ChangesRequestedDTO | null;
};

