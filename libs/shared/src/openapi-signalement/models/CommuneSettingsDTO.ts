/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CommuneSettingsDTO = {
    disabled: boolean;
    message?: string;
    mode?: CommuneSettingsDTO.mode;
    filteredSources?: Array<string>;
};
export namespace CommuneSettingsDTO {
    export enum mode {
        FULL = 'FULL',
        LIGHT = 'LIGHT',
    }
}

