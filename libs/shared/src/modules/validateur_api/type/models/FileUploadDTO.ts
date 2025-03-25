/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type FileUploadDTO = {
    file: Blob;
    /**
     * Le masque des erreurs appliquer pour les profilErrors
     */
    profile?: FileUploadDTO.profile;
    /**
     * Renvoie l'enssemble des lignes parsées de la BAL
     */
    withRows?: boolean;
};
export namespace FileUploadDTO {
    /**
     * Le masque des erreurs appliquer pour les profilErrors
     */
    export enum profile {
        _1_4 = '1.4',
        _1_3 = '1.3',
        _1_3_RELAX = '1.3-relax',
        _1_3_STRICT = '1.3-strict',
        _1_2_STRICT = '1.2-strict',
        _1_1_STRICT = '1.1-strict',
    }
}

