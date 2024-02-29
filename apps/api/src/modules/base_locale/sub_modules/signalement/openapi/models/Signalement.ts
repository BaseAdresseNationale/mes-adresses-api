/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Author } from './Author';
import type { ChangesRequested } from './ChangesRequested';
import type { ExistingLocation } from './ExistingLocation';
export type Signalement = {
    codeCommune: string;
    type: string;
    author?: Author | null;
    existingLocation?: ExistingLocation | null;
    changesRequested: ChangesRequested;
    processedAt?: string | null;
};

