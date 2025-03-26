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
