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

// Certain codeCommune ne sont pas le même du cadastre au COG
const CogTocadastre = {
  97701: '97123', // Saint-Barthélemy
  49126: '49069', // Orée d'Anjou
  97801: '97127', // Saint-Martin
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

    const isCOM = checkIsCommuneOutreMer(codeCommune);
    const hasMapsStyles = checkHasMapsStyles(codeCommune, isCOM);
    const communesDeleguees = getCommunesPrecedentesByChefLieu(codeCommune);

    // Le COG en cours n'est pas pris en compte par le cadastre
    // Donc si les précédente commune existent dans le cadastre, on les map pour les affiché en front
    let communeDelegueesHasCadastre = [];
    if (communesDeleguees.length > 0) {
      communeDelegueesHasCadastre = communesDeleguees
        .filter(({ code }) => checkHasCadastre(code))
        .map(({ code }) => code);
    }

    // On vérifie si la commune (ou ses précédentes) a un cadastre
    const hasCadastre =
      checkHasCadastre(CogTocadastre[codeCommune] || codeCommune) ||
      communeDelegueesHasCadastre.length > 0;

    // Si le code_insee ne correspond pas au code commune du cadastre, on map les bon code commune
    let codeCommunesCadastre = [];
    if (CogTocadastre[codeCommune]) {
      codeCommunesCadastre.push(CogTocadastre[codeCommune]);
    } else if (communeDelegueesHasCadastre.length > 0) {
      codeCommunesCadastre = communeDelegueesHasCadastre;
    }

    return {
      code: commune.code,
      ...(codeCommunesCadastre && { codeCommunesCadastre }),
      nom: commune.nom,
      communesDeleguees,
      hasCadastre,
      isCOM,
      ...hasMapsStyles,
    };
  }
}
