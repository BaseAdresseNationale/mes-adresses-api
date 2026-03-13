/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CommuneStatusDTO = {
    disabled: boolean;
    message?: string;
    mode?: CommuneStatusDTO.mode;
};
export namespace CommuneStatusDTO {
    export enum mode {
        FULL = 'FULL',
        LIGHT = 'LIGHT',
    }
}

