import { Injectable } from '@nestjs/common';
import { groupBy, keyBy } from 'lodash';
import * as communes from '@etalab/decoupage-administratif/data/communes.json';
import * as departements from '@etalab/decoupage-administratif/data/departements.json';
import { CommuneCOG, DepartementCOG } from './cog.types';

@Injectable()
export class COGService {
  private filteredCommunes: CommuneCOG[];
  private communesIndex: Record<string, CommuneCOG>;
  private departementsIndex: Record<string, DepartementCOG>;
  private communesByDepartementIndex: Record<string, CommuneCOG>;

  constructor() {
    this.filteredCommunes = (communes as Array<any>).filter((c) =>
      ['commune-actuelle', 'arrondissement-municipal'].includes(c.type),
    );
    this.communesIndex = keyBy(this.filteredCommunes, 'code');
    this.departementsIndex = keyBy(departements, 'code');
    this.communesByDepartementIndex = groupBy(
      this.filteredCommunes,
      'departement',
    );
  }
  getCommunesByDepartement(codeDepartement) {
    return this.communesByDepartementIndex[codeDepartement] || [];
  }

  getCommune(codeCommune) {
    return this.communesIndex[codeCommune];
  }

  getCodesCommunes() {
    return this.filteredCommunes.map((c) => c.code);
  }

  getDepartement(codeDepartement) {
    return this.departementsIndex[codeDepartement];
  }
}
