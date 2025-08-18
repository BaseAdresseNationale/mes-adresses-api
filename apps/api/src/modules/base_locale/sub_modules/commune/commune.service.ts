import {
  getCommune,
  getCommunesPrecedentesByChefLieu,
} from '@/shared/utils/cog.utils';
import {
  checkHasCadastre,
  checkHasMapsStyles,
  checkIsCommuneOutreMer,
} from '@/lib/utils/commune.utils';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CommuneDTO } from './dto/commune.dto';

// Certain codeCommune ne sont pas le même du cadastre au COG (ex: Saint-Barth)
const CogTocadastre = {
  97701: '97123',
};

@Injectable()
export class CommuneService {
  constructor() {}

  getCommuneExtraData(codeCommune: string): CommuneDTO {
    const commune = getCommune(codeCommune);
    if (!commune) {
      throw new HttpException(
        `Commune ${codeCommune} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const hasCadastre = checkHasCadastre(
      CogTocadastre[codeCommune] || codeCommune,
    );
    const isCOM = checkIsCommuneOutreMer(codeCommune);
    const hasMapsStyles = checkHasMapsStyles(codeCommune, isCOM);
    const communesDeleguees = getCommunesPrecedentesByChefLieu(codeCommune);

    return {
      code: commune.code,
      ...(CogTocadastre[codeCommune] && {
        codeCommuneCadastre: CogTocadastre[codeCommune],
      }),
      nom: commune.nom,
      communesDeleguees,
      hasCadastre,
      isCOM,
      ...hasMapsStyles,
    };
  }
}
