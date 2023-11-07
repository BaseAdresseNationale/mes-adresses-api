import { getCommune } from '@/shared/utils/cog.utils';
import {
  checkHasCadastre,
  checkHasMapsStyles,
  checkIsCommuneOutreMer,
} from '@/lib/utils/commune.utils';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class CommuneService {
  constructor() {}

  getCommuneExtraData(codeCommune: string) {
    if (!getCommune(codeCommune)) {
      throw new HttpException(
        `Commune ${codeCommune} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const hasCadastre = checkHasCadastre(codeCommune);
    const isCOM = checkIsCommuneOutreMer(codeCommune);
    const hasMapsStyles = checkHasMapsStyles(codeCommune, isCOM);

    return {
      hasCadastre,
      isCOM,
      ...hasMapsStyles,
    };
  }
}
