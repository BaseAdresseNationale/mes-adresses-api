import {
  getCommune,
  getCommunesAcienneByChefLieu,
} from '@/shared/utils/cog.utils';
import {
  checkHasCadastre,
  checkHasMapsStyles,
  checkIsCommuneOutreMer,
} from '@/lib/utils/commune.utils';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CommuneDTO } from './dto/commune.dto';

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

    const hasCadastre = checkHasCadastre(codeCommune);
    const isCOM = checkIsCommuneOutreMer(codeCommune);
    const hasMapsStyles = checkHasMapsStyles(codeCommune, isCOM);
    const communesDeleguees = getCommunesAcienneByChefLieu(codeCommune);

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
