/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuthorDTO } from './AuthorDTO';
import type { ChangesRequestedDTO } from './ChangesRequestedDTO';
import type { ExistingLocationDTO } from './ExistingLocationDTO';
export type CreateSignalementDTO = {
    codeCommune: string;
    type: string;
    author?: AuthorDTO | null;
    existingLocation?: ExistingLocationDTO | null;
    changesRequested: ChangesRequestedDTO | null;
};

