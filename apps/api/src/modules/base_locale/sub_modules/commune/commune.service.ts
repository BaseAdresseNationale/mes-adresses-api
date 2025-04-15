import {
  getCommune,
  getCommuneAcienneByChefLieu,
} from '@/shared/utils/cog.utils';
import {
  checkHasCadastre,
  checkHasMapsStyles,
  checkIsCommuneOutreMer,
} from '@/lib/utils/commune.utils';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CommuneCOG } from '@/shared/types/cog.type';

@Injectable()
export class CommuneService {
  constructor() {}

  getCommuneExtraData(codeCommune: string): CommuneCOG & {
    isCOM: boolean;
    hasCadastre: boolean;
    hasOpenMapTiles: boolean;
    hasOrtho: boolean;
    hasPlanIGN: boolean;
    communesDeleguees: string[];
  } {
    const commune = getCommune(codeCommune);
    if (!commune) {
      throw new HttpException(
        `Commune ${codeCommune} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const hasCadastre = checkHasCadastre(codeCommune);
    const isCOM = checkIsCommuneOutreMer(codeCommune);
    const hasMapsStyles = checkHasMapsStyles(codeCommune, isCOM);
    const communesDeleguees = getCommuneAcienneByChefLieu(codeCommune);

    return {
      code: commune.code,
      nom: commune.nom,
      communesDeleguees,
      hasCadastre,
      isCOM,
      ...hasMapsStyles,
    };
  }
}
