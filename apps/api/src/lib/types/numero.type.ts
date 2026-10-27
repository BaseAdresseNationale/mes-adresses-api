import { Numero } from '@/shared/entities/numero.entity';

export type NumeroInBbox = {
  id: string;
  numero: number;
  suffixe: string;
  parcelles: string[];
  certifie: string;
  voieId: string;
  toponymeId: string;
  point: { type: string; coordinates: number[][] };
};

export type WithNumero<T> = T & {
  nbNumeros: number;
  nbNumerosCertifies: number;
  isAllCertified: boolean;
  commentedNumeros: Numero[];
};
