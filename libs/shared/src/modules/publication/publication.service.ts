import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as hasha from 'hasha';

import {
  Habilitation,
  StatusHabiliation,
} from '@/shared/modules/api_depot/types/habilitation.type';
import { Revision } from '@/shared/modules/api_depot/types/revision.type';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import {
  StatusBaseLocalEnum,
  StatusSyncEnum,
} from '@/shared/schemas/base_locale/status.enum';
import { Numero } from '@/shared/schemas/numero/numero.schema';
import { ApiDepotService } from '@/shared/modules/api_depot/api_depot.service';
import { ExportCsvService } from '@/shared/modules/export_csv/export_csv.service';
import { MailerService } from '@/shared/modules/mailer/mailer.service';
import { formatEmail as createPublicationNotificationEmail } from '@/shared/modules/mailer/templates/bal-publication-notification';
import { Sync } from '@/shared/schemas/base_locale/sync.schema';

@Injectable()
export class PublicationService {
  constructor(
    private readonly apiDepotService: ApiDepotService,
    private readonly exportCsvService: ExportCsvService,
    private readonly mailerService: MailerService,
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
    @InjectModel(Numero.name) private numeroModel: Model<Numero>,
  ) {}

  async exec(
    balId: Types.ObjectId,
    options: { force?: boolean } = {},
  ): Promise<BaseLocale> {
    const baseLocale = await this.baseLocaleModel.findOne(balId);

    // On vérifie que la BAL n'est pas en DEMO ou DRAFT
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

    // On vérifie que la BAL a une habilitation rattachée
    if (!baseLocale._habilitation) {
      throw new HttpException(
        'Aucune habilitation rattachée à cette Base Adresse Locale',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    // On récupère l'habilitation sur l'api-depot
    const habilitation: Habilitation =
      await this.apiDepotService.findOneHabiliation(baseLocale._habilitation);

    // On verifie que l'habilitation est valide
    if (habilitation.status !== StatusHabiliation.ACCEPTED) {
      throw new HttpException(
        'L’habilitation rattachée n’est pas une habilitation valide',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    // On verifie que l'habilitation n'est pas expirée
    if (
      !habilitation.expiresAt ||
      new Date(habilitation.expiresAt) < new Date()
    ) {
      throw new HttpException(
        'L’habilitation rattachée a expiré',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    // On récupère les numeros de la BAL
    const numeroCount = await this.numeroModel.countDocuments({
      _bal: balId,
      _deleted: null,
    });
    // On vérifie qu'il y ai au moins un numero dans la BAL
    if (numeroCount === 0) {
      throw new HttpException(
        'La base locale ne possède aucune adresse',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    // On traite ensuite le cas de la première publication
    if (baseLocale.status === StatusBaseLocalEnum.READY_TO_PUBLISH) {
      // On créer le fichier BAL CSV
      const file: string = await this.exportCsvService.exportToCsv(baseLocale);
      // On créer la publication sur l'api-depot
      const publishedRevision: Revision =
        await this.apiDepotService.publishNewRevision(
          codeCommune,
          baseLocale._id.toString(),
          file,
          baseLocale._habilitation,
        );
      // On envoie un mail de notification
      const email = createPublicationNotificationEmail({ baseLocale });
      await this.mailerService.sendMail(email, baseLocale.emails);
      // On marque le sync de la BAL en published
      return this.markAsSynced(baseLocale, publishedRevision._id);
    }

    const sync = await this.updateSyncInfo(balId);

    // On traite les BAL dont le sync est en conflit ou outdated
    if (
      (sync.status === StatusSyncEnum.CONFLICT && options.force) ||
      sync.status === StatusSyncEnum.OUTDATED
    ) {
      // On créer le fichier BAL CSV
      const file: string = await this.exportCsvService.exportToCsv(baseLocale);
      // ON créer le hash du fichier BAL CSV
      const hash = hasha(file, { algorithm: 'sha256' });
      // On récupère la révision courante pour la commune
      const currentRevision =
        await this.apiDepotService.getCurrentRevision(codeCommune);
      // On récupère le fichier BAL de la révision courante
      const currentRevisionBalFile = currentRevision.files.find(
        (f) => f.type === 'bal',
      );
      // console.log(currentRevisionBalFile.hash, hash);
      // On traite si le hash du fichier BAL CSV est différent du fichier de la révision courante
      // Cela veut dire qu'il y a eu un changement dans le fichier
      if (currentRevisionBalFile.hash !== hash) {
        // On créer la publication sur l'api-depot
        const publishedRevision = await this.apiDepotService.publishNewRevision(
          codeCommune,
          baseLocale._id.toString(),
          file,
          baseLocale._habilitation,
        );
        // On marque le sync de la BAL en published
        return this.markAsSynced(baseLocale, publishedRevision._id);
      }

      // On marque le sync de la BAL en published
      return this.markAsSynced(
        baseLocale,
        sync.lastUploadedRevisionId.toString(),
      );
    }

    return this.baseLocaleModel.findOne(balId);
  }

  public async pause(balId: Types.ObjectId) {
    return this.setIsPaused(balId, true);
  }

  public async resume(balId: Types.ObjectId) {
    return this.setIsPaused(balId, false);
  }

  private async setIsPaused(
    balId: Types.ObjectId,
    isPaused: boolean,
  ): Promise<BaseLocale> {
    const baseLocale: BaseLocale = await this.baseLocaleModel.findOneAndUpdate(
      {
        _id: balId,
        'sync.status': {
          $in: [StatusSyncEnum.SYNCED, StatusSyncEnum.OUTDATED],
        },
      },
      { $set: { 'sync.isPaused': isPaused } },
      { returnDocument: 'after' },
    );

    if (!baseLocale) {
      throw new HttpException(
        'Le statut de synchronisation doit être actif pour modifier l’état de pause',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    return baseLocale;
  }

  private async updateSync(
    baseLocale: BaseLocale,
    syncChanges: Partial<Sync>,
  ): Promise<Sync> {
    const changes: Partial<BaseLocale> = {
      sync: {
        ...baseLocale.sync,
        ...syncChanges,
      },
      ...(syncChanges.status === 'conflict' && {
        status: StatusBaseLocalEnum.REPLACED,
      }),
    };

    const baseLocaleChanged: BaseLocale =
      await this.baseLocaleModel.findOneAndUpdate(
        { _id: baseLocale._id },
        { $set: changes },
        { returnDocument: 'after' },
      );

    return baseLocaleChanged.sync;
  }

  private async markAsSynced(
    baseLocale: BaseLocale,
    lastUploadedRevisionId: string,
  ) {
    const sync: Sync = {
      status: StatusSyncEnum.SYNCED,
      isPaused: false,
      currentUpdated: baseLocale._updated,
      lastUploadedRevisionId: new Types.ObjectId(lastUploadedRevisionId),
    };

    const baseLocaleSynced: BaseLocale =
      await this.baseLocaleModel.findOneAndUpdate(
        { _id: baseLocale._id },
        { $set: { status: StatusBaseLocalEnum.PUBLISHED, sync } },
        { returnDocument: 'after' },
      );

    return baseLocaleSynced;
  }

  private async updateSyncInfo(balId: Types.ObjectId): Promise<Sync> {
    // On récupère la BAL
    const baseLocale = await this.baseLocaleModel.findOne(balId);

    // Si le status de la BAL est PUBLISHED on retourne sync
    if (baseLocale.status !== StatusBaseLocalEnum.PUBLISHED) {
      return baseLocale.sync;
    }

    // On vérifie que le status est synced ou outdated
    if (
      !baseLocale.sync ||
      (baseLocale.sync.status !== StatusSyncEnum.SYNCED &&
        baseLocale.sync.status !== StatusSyncEnum.OUTDATED)
    ) {
      throw new HttpException(
        'Le statut de synchronisation doit être "synced" ou "outdated"',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    // On récupère la révision courante de l'api-depot
    const currentRevision = await this.apiDepotService.getCurrentRevision(
      baseLocale.commune,
    );

    // On vérifie si la dernière publication de la BAL est la révision courante
    if (
      new Types.ObjectId(currentRevision._id) !==
      baseLocale.sync.lastUploadedRevisionId
    ) {
      return this.updateSync(baseLocale, {
        status: StatusSyncEnum.CONFLICT,
        isPaused: true,
      });
    }

    // Si la date du changement de BAL est la même que la date du currentUpdated du sync de la BAL
    // On met le status du sync de la BAL a sync et on le retourne
    // ???
    if (baseLocale._updated === baseLocale.sync.currentUpdated) {
      if (baseLocale.sync.status === StatusSyncEnum.SYNCED) {
        return baseLocale.sync;
      }

      return this.updateSync(baseLocale, {
        status: StatusSyncEnum.SYNCED,
      });
    }

    // Si le status du sync est outdated on retourne sync
    if (baseLocale.sync.status === StatusSyncEnum.OUTDATED) {
      return baseLocale.sync;
    }

    // Sinon on set le status de sync à outdated
    return this.updateSync(baseLocale, {
      status: StatusSyncEnum.OUTDATED,
    });
  }
}
