export type CommuneCOG = {
  code: string;
  nom: string;
  typeLiaison: number;
  zone: string;
  arrondissement: string;
  departement: string;
  region: string;
  type: string;
  rangChefLieu: number;
  siren: string;
  codesPostaux: string[];
  population: number;
};

export type DepartementCOG = {
  code: string;
  nom: string;
  region: string;
  chefLieu: string;
  typeLiaison: number;
  zone: string;
};
