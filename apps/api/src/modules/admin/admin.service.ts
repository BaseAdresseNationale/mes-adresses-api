import {
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { ObjectId } from 'bson';
import { In } from 'typeorm';

import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { FusionCommunesDTO } from './dto/fusion_bases_locales.dto';
import {
  RepublishCommuneReportDTO,
  RepublishCommunesReportDTO,
  RepublishReportStatusEnum,
  RepublishStatusEnum,
} from './dto/republish_communes.dto';
import { CacheService } from '@/shared/modules/cache/cache.service';
import { PriorityEnum } from '@/shared/types/task.type';

const REPUBLISH_REPORT_KEY_PREFIX = 'republish-communes-report:';
const REPUBLISH_CURRENT_REPORT_KEY = 'republish-communes-current-report';
// Au-delà de ce délai sans mise à jour, un lot "running" est considéré comme interrompu
const REPUBLISH_STALE_DELAY_MS = 5 * 60 * 1000;
import { PopulateService } from '../base_locale/sub_modules/populate/populate.service';
import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { VoieService } from '../voie/voie.service';
import { ToponymeService } from '../toponyme/toponyme.service';
import { NumeroService } from '../numeros/numero.service';

@Injectable()
export class AdminService {
  constructor(
    @Inject(forwardRef(() => PopulateService))
    private populateService: PopulateService,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
    @Inject(forwardRef(() => VoieService))
    private voieService: VoieService,
    @Inject(forwardRef(() => ToponymeService))
    private toponymeService: ToponymeService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
    private cacheService: CacheService,
    private readonly logger: Logger,
  ) {}

  private replaceBalIds(
    bal: BaseLocale,
    codeCommune: string,
    voies: Voie[],
    toponymes: Toponyme[],
    numeros: Numero[],
  ) {
    const idVoies = {};
    const idToponymes = {};

    for (const voie of voies) {
      voie.balId = bal.id;
      const newId = new ObjectId().toHexString();
      idVoies[voie.id] = newId;
      voie.id = newId;
    }

    for (const toponyme of toponymes) {
      toponyme.balId = bal.id;
      const newId = new ObjectId().toHexString();
      idToponymes[toponyme.id] = newId;
      toponyme.id = newId;
      toponyme.communeDeleguee = codeCommune;
    }

    for (const numero of numeros) {
      numero.balId = bal.id;
      numero.id = new ObjectId().toHexString();
      numero.voieId = idVoies[numero.voieId];
      numero.toponymeId = numero.toponymeId
        ? idToponymes[numero.toponymeId]
        : null;
      numero.communeDeleguee = codeCommune;
    }
  }

  private setBalCommuneDeleguee(
    codeCommune: string,
    numeros: Partial<Numero>[],
    toponymes: Partial<Toponyme>[],
  ) {
    for (const numero of numeros) {
      numero.communeDeleguee = codeCommune;
    }
    for (const toponyme of toponymes) {
      toponyme.communeDeleguee = codeCommune;
    }
  }

  public async fusionCommunes({
    codeCommune,
    nom,
    emails,
    communes,
  }: FusionCommunesDTO): Promise<BaseLocale> {
    const newbaseLocale: BaseLocale = await this.baseLocaleService.createOne({
      commune: codeCommune,
      nom,
      emails,
    });
    for (const { codeCommune, balId } of communes) {
      if (balId) {
        const voies = await this.voieService.findMany({ balId });
        const toponymes = await this.toponymeService.findMany({ balId });
        const numeros = await this.numeroService.findMany({ balId });
        this.replaceBalIds(
          newbaseLocale,
          codeCommune,
          voies,
          toponymes,
          numeros,
        );
        await this.baseLocaleService.populate(
          newbaseLocale,
          {
            numeros,
            voies,
            toponymes,
          },
          false,
        );
      } else {
        const { numeros, voies, toponymes } =
          await this.populateService.extract(codeCommune);
        this.setBalCommuneDeleguee(codeCommune, numeros, toponymes);
        await this.baseLocaleService.populate(
          newbaseLocale,
          {
            numeros,
            voies,
            toponymes,
          },
          false,
        );
      }
    }

    return newbaseLocale;
  }

  private async republishBaseLocale(
    baseLocale: BaseLocale,
  ): Promise<RepublishCommuneReportDTO> {
    const report: RepublishCommuneReportDTO = {
      codeCommune: baseLocale.commune,
      balId: baseLocale.id,
      status: RepublishStatusEnum.ERROR,
    };

    try {
      const previousRevisionId = baseLocale.sync?.lastUploadedRevisionId;
      // Priorité basse pour ne pas bloquer les autres tâches du cron
      const result = await this.baseLocaleService.forcePublish(
        baseLocale.id,
        PriorityEnum.LOW,
      );
      if (!result.success) {
        report.error = result.error;
        return report;
      }

      const updatedBaseLocale = await this.baseLocaleService.findOneOrFail(
        baseLocale.id,
      );
      report.revisionId = updatedBaseLocale.sync?.lastUploadedRevisionId;
      report.status =
        report.revisionId && report.revisionId !== previousRevisionId
          ? RepublishStatusEnum.PUBLISHED
          : RepublishStatusEnum.UNCHANGED;
    } catch (error) {
      report.error = error.message || String(error);
    }

    return report;
  }

  private async saveRepublishReport(report: RepublishCommunesReportDTO) {
    report.updatedAt = new Date();
    await this.cacheService.set(
      `${REPUBLISH_REPORT_KEY_PREFIX}${report.id}`,
      JSON.stringify(report),
    );
  }

  private isRunning(report: RepublishCommunesReportDTO): boolean {
    return (
      report?.status === RepublishReportStatusEnum.RUNNING &&
      Date.now() - new Date(report.updatedAt).getTime() <
        REPUBLISH_STALE_DELAY_MS
    );
  }

  public async getRepublishReport(
    reportId: string,
  ): Promise<RepublishCommunesReportDTO> {
    const cache = await this.cacheService.get(
      `${REPUBLISH_REPORT_KEY_PREFIX}${reportId}`,
    );
    if (!cache) {
      throw new HttpException(
        `Rapport ${reportId} introuvable`,
        HttpStatus.NOT_FOUND,
      );
    }

    return JSON.parse(cache.value);
  }

  public async startRepublishCommunes(
    codesCommunes: string[],
  ): Promise<RepublishCommunesReportDTO> {
    // Un seul lot à la fois : on vérifie que le dernier lot lancé est terminé
    const currentReportId = await this.cacheService.get(
      REPUBLISH_CURRENT_REPORT_KEY,
    );
    if (currentReportId) {
      const currentReport = await this.getRepublishReport(
        currentReportId.value,
      ).catch(() => null);
      if (this.isRunning(currentReport)) {
        throw new HttpException(
          `Une republication est déjà en cours (rapport ${currentReport.id})`,
          HttpStatus.CONFLICT,
        );
      }
    }

    const uniqueCodesCommunes = [...new Set(codesCommunes)];
    const now = new Date();
    const report: RepublishCommunesReportDTO = {
      id: new ObjectId().toHexString(),
      status: RepublishReportStatusEnum.RUNNING,
      startedAt: now,
      updatedAt: now,
      totalCommunes: uniqueCodesCommunes.length,
      processedCommunes: 0,
      published: 0,
      unchanged: 0,
      errors: 0,
      notFound: 0,
      details: [],
    };

    await this.saveRepublishReport(report);
    await this.cacheService.set(REPUBLISH_CURRENT_REPORT_KEY, report.id);

    // On ne fait pas d'await : le traitement continue en tâche de fond
    this.runRepublishCommunes(report, uniqueCodesCommunes).catch(
      async (error) => {
        this.logger.error(
          `Republication ${report.id} interrompue`,
          error,
          AdminService.name,
        );
        report.status = RepublishReportStatusEnum.FAILED;
        report.error = error.message || String(error);
        report.finishedAt = new Date();
        await this.saveRepublishReport(report).catch(() => null);
      },
    );

    return report;
  }

  private async runRepublishCommunes(
    report: RepublishCommunesReportDTO,
    codesCommunes: string[],
  ) {
    const baseLocales = await this.baseLocaleService.findMany({
      commune: In(codesCommunes),
      status: StatusBaseLocalEnum.PUBLISHED,
    });

    const counterByStatus: Record<
      RepublishStatusEnum,
      'published' | 'unchanged' | 'errors' | 'notFound'
    > = {
      [RepublishStatusEnum.PUBLISHED]: 'published',
      [RepublishStatusEnum.UNCHANGED]: 'unchanged',
      [RepublishStatusEnum.ERROR]: 'errors',
      [RepublishStatusEnum.NOT_FOUND]: 'notFound',
    };
    const addDetail = (detail: RepublishCommuneReportDTO) => {
      report.details.push(detail);
      report[counterByStatus[detail.status]]++;
    };

    // Les publications sont faites une par une (job cron + appels api-depot)
    for (const codeCommune of codesCommunes) {
      const baseLocalesCommune = baseLocales.filter(
        ({ commune }) => commune === codeCommune,
      );

      if (baseLocalesCommune.length === 0) {
        addDetail({
          codeCommune,
          status: RepublishStatusEnum.NOT_FOUND,
          error: 'Aucune Base Adresse Locale publiée pour cette commune',
        });
      }

      for (const baseLocale of baseLocalesCommune) {
        addDetail(await this.republishBaseLocale(baseLocale));
      }

      report.processedCommunes++;
      await this.saveRepublishReport(report);
    }

    report.status = RepublishReportStatusEnum.DONE;
    report.finishedAt = new Date();
    await this.saveRepublishReport(report);
  }
}
