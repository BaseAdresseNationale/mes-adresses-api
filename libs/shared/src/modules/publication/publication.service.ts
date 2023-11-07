import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Habilitation,
  StatusHabiliation,
} from '@/shared/modules/api_depot/types/habilitation.type';
import { Revision } from '@/shared/modules/api_depot/types/revision.type';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { StatusBaseLocalEnum } from '@/shared/schemas/base_locale/status.enum';
import { Numero } from '@/shared/schemas/numero/numero.schema';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { ApiDepotService } from '@/shared/modules/api_depot/api_depot.service';
import { ExportCsvService } from '@/shared/modules/export_csv/export_csv.service';
import { MailerService } from '@/shared/modules/mailer/mailer.service';
import { formatEmail as createPublicationNotificationEmail } from '@/shared/modules/mailer/templates/bal-publication-notification';

@Injectable()
export class PublicationService {
  constructor(
    private readonly apiDepotService: ApiDepotService,
    private readonly exportCsvService: ExportCsvService,
    private readonly mailerService: MailerService,
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
    @InjectModel(Numero.name) private numeroModel: Model<Numero>,
    @InjectModel(Voie.name) private voieModel: Model<Voie>,
    @InjectModel(Toponyme.name) private toponymeModel: Model<Toponyme>,
  ) {}

  async exec(balId: Types.ObjectId, options: { force?: boolean } = {}) {
    const baseLocale = await this.baseLocaleModel.findOne(balId);

    /* On commence par vérifier que la publication/synchronisation est possible */

    if (
      baseLocale.status === StatusBaseLocalEnum.DEMO ||
      baseLocale.status === StatusBaseLocalEnum.DRAFT
    ) {
      throw new HttpException(
        'La synchronisation pas possibles pour les Bases Adresses Locales de démo ou en mode brouillon',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const codeCommune = baseLocale.commune;

    if (!baseLocale._habilitation) {
      throw new HttpException(
        'Aucune habilitation rattachée à cette Base Adresse Locale',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const habilitation: Habilitation =
      await this.apiDepotService.findOneHabiliation(baseLocale._habilitation);

    if (habilitation.status !== StatusHabiliation.ACCEPTED) {
      throw new HttpException(
        'L’habilitation rattachée n’est pas une habilitation valide',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    if (new Date(habilitation.expiresAt) < new Date()) {
      throw new HttpException(
        'L’habilitation rattachée a expiré',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const numeroCount = await this.numeroModel.countDocuments({
      _bal: balId,
      _deleted: null,
    });
    if (numeroCount === 0) {
      throw new HttpException(
        'La base locale ne possède aucune adresse',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    /* On traite ensuite le cas de la première publication (status=ready-to-publish) */

    if (baseLocale.status === StatusBaseLocalEnum.READY_TO_PUBLISH) {
      const file: string = await this.exportCsvService.exportToCsv(baseLocale);
      const publishedRevision: Revision =
        await this.apiDepotService.publishNewRevision(
          codeCommune,
          baseLocale._id.toString(),
          file,
          baseLocale._habilitation,
        );

      const email = createPublicationNotificationEmail({ baseLocale });
      await this.mailerService.sendMail(email, baseLocale.emails);

      return markAsSynced(baseLocale, publishedRevision._id);
    }

    const sync = await updateSyncInfo(balId);

    if (
      (sync.status === 'conflict' && options.force) ||
      sync.status === 'outdated'
    ) {
      const file = await BaseLocale.exportAsCsv(balId);
      const hash = hasha(file, { algorithm: 'sha256' });
      const currentRevision = await getCurrentRevision(codeCommune);
      const currentRevisionBalFile = currentRevision.files.find(
        (f) => f.type === 'bal',
      );

      if (currentRevisionBalFile.hash !== hash) {
        const publishedRevision = await publishNewRevision(
          codeCommune,
          baseLocale._id,
          file,
          baseLocale._habilitation,
        );
        return markAsSynced(baseLocale, publishedRevision._id);
      }

      return markAsSynced(baseLocale, sync.lastUploadedRevisionId);
    }

    return BaseLocale.fetchOne(balId);
  }
}
