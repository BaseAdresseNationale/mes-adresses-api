import {
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ArrayContains,
  FindOptionsSelect,
  FindOptionsWhere,
  In,
  InsertResult,
  IsNull,
  Not,
  Repository,
  UpdateResult,
} from 'typeorm';
import { uniq, difference, groupBy } from 'lodash';

import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { MailerService } from '@/shared/modules/mailer/mailer.service';
import { formatEmail as createBalCreationNotificationEmail } from '@/shared/modules/mailer/templates/bal-creation-notification';
import { formatEmail as createNewAdminNotificationEmail } from '@/shared/modules/mailer/templates/new-admin-notification';
import { formatEmail as createRecoveryNotificationEmail } from '@/shared/modules/mailer/templates/recovery-notification';
import { formatEmail as createTokenRenewalNotificationEmail } from '@/shared/modules/mailer/templates/token-renewal-notification';
import { Habilitation } from '@/shared/modules/api_depot/types/habilitation.type';
import { BanPlateformService } from '@/shared/modules/ban_plateform/ban_plateform.service';

import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { VoieService } from '@/modules/voie/voie.service';
import { NumeroService } from '@/modules/numeros/numero.service';
import { CreateBaseLocaleDTO } from '@/modules/base_locale/dto/create_base_locale.dto';
import { generateBase62String } from '@/lib/utils/token.utils';
import { ExtendedBaseLocaleDTO } from './dto/extended_base_locale.dto';
import { StatusBaseLocalEnum } from '@/shared/schemas/base_locale/status.enum';
import { UpdateBaseLocaleDTO } from './dto/update_base_locale.dto';
import { extendWithNumeros } from '@/shared/utils/numero.utils';
import { CreateDemoBaseLocaleDTO } from './dto/create_demo_base_locale.dto';
import { getCommune } from '@/shared/utils/cog.utils';
import { PopulateService } from './sub_modules/populate/populate.service';
import { UpdateBaseLocaleDemoDTO } from './dto/update_base_locale_demo.dto';
import { FromCsvType, extractFromCsv } from '@/lib/utils/csv.utils';
import { ImportFileBaseLocaleDTO } from './dto/import_file_base_locale.dto';
import { RecoverBaseLocaleDTO } from './dto/recover_base_locale.dto';
import { AllDeletedInBalDTO } from './dto/all_deleted_in_bal.dto';

@Injectable()
export class BaseLocaleService {
  constructor(
    @InjectRepository(BaseLocale)
    private basesLocalesRepository: Repository<BaseLocale>,
    private readonly mailerService: MailerService,
    @Inject(forwardRef(() => VoieService))
    private voieService: VoieService,
    @Inject(forwardRef(() => ToponymeService))
    private toponymeService: ToponymeService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
    @Inject(forwardRef(() => PopulateService))
    private populateService: PopulateService,
    @Inject(forwardRef(() => BanPlateformService))
    private banPlateformService: BanPlateformService,
  ) {}

  public async findOneOrFail(balId: string): Promise<BaseLocale> {
    // Créer le filtre where et lance la requète postgres
    const where: FindOptionsWhere<BaseLocale> = { id: balId };
    const baseLocale = await this.basesLocalesRepository.findOne({ where });
    // Si la bal n'existe pas, on throw une erreur
    if (!baseLocale) {
      throw new HttpException(
        `BaseLocale ${balId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return baseLocale;
  }

  public async count(where: FindOptionsWhere<BaseLocale>): Promise<number> {
    return this.basesLocalesRepository.count({ where });
  }

  public async findMany(
    where: FindOptionsWhere<BaseLocale>,
    select?: FindOptionsSelect<BaseLocale>,
    limit?: number,
    offset?: number,
  ): Promise<BaseLocale[]> {
    return this.basesLocalesRepository.find({
      where,
      ...(select && { select }),
      ...(limit && { take: limit }),
      ...(offset && { skip: offset }),
    });
  }

  public async countGroupByStatus(): Promise<any[]> {
    return this.basesLocalesRepository
      .createQueryBuilder()
      .select('status', 'COUNT(id) as count')
      .groupBy('status')
      .getRawMany();
  }

  public async createOne(
    createInput: CreateBaseLocaleDTO,
  ): Promise<BaseLocale> {
    // On récupère l'id ban de la BAL
    const banId: string = await this.banPlateformService.getIdBanCommune(
      createInput.commune,
    );
    // On créer l'object bal
    const entityToSave: BaseLocale = await this.basesLocalesRepository.create({
      banId,
      ...createInput,
      token: generateBase62String(20),
      status: StatusBaseLocalEnum.DRAFT,
    });
    // On insert l'object dans postgres
    const newBaseLocale: BaseLocale =
      await this.basesLocalesRepository.save(entityToSave);
    // On envoie un mail de création de Bal
    const email = createBalCreationNotificationEmail({
      baseLocale: newBaseLocale,
    });
    await this.mailerService.sendMail(email, newBaseLocale.emails);
    // On retourne la Bal créé
    return newBaseLocale;
  }

  public async createDemo({
    commune,
    populate,
  }: CreateDemoBaseLocaleDTO): Promise<BaseLocale> {
    // Insere la nouvelle Bal de demo
    const banId: string =
      await this.banPlateformService.getIdBanCommune(commune);
    // On créer l'object bal
    const entityToSave = await this.basesLocalesRepository.create({
      banId,
      token: generateBase62String(20),
      commune,
      nom: `Adresses de ${getCommune(commune).nom} [démo]`,
      status: StatusBaseLocalEnum.DEMO,
    });
    // On insert l'object dans postgres
    const newDemoBaseLocale: BaseLocale =
      await this.basesLocalesRepository.save(entityToSave);
    // Si besoin on populate la Bal
    if (populate) {
      await this.extractAndPopulate(newDemoBaseLocale);
    }
    // On retourne la Bal de demo créé
    return newDemoBaseLocale;
  }

  async extractAndPopulate(baseLocale: BaseLocale): Promise<BaseLocale> {
    // On extrait la Bal de l'assemblage BAN ou la derniere revision sur l'api-depot
    const data: FromCsvType = await this.populateService.extract(
      baseLocale.commune,
    );
    // On populate la Bal
    return this.populate(baseLocale, data);
  }

  async importFile(
    baseLocale: BaseLocale,
    file: Buffer,
  ): Promise<ImportFileBaseLocaleDTO> {
    // On extrait les infos du fichier
    const {
      voies,
      numeros,
      toponymes,
      isValid,
      accepted,
      rejected,
    }: FromCsvType = await extractFromCsv(file, baseLocale.commune);
    // Si les informations ne sont pas valide on lance une erreur
    if (!isValid) {
      throw new HttpException(
        `CSV file is not valid`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    // On populate la Bal avec les infos du fichier
    await this.populate(baseLocale, { voies, numeros, toponymes });
    // On met a jour le updatedAt de la Bal
    await this.touch(baseLocale.id);

    return {
      isValid: true,
      accepted,
      rejected,
      commune: baseLocale.commune,
      voies: voies.length,
      numeros: numeros.length,
    };
  }

  async updateOne(
    baseLocale: BaseLocale,
    update: UpdateBaseLocaleDTO,
  ): Promise<BaseLocale> {
    // On lance une erreur si la Bal est demo
    if (baseLocale.status === StatusBaseLocalEnum.DEMO) {
      throw new HttpException(
        'Une Base Adresse Locale de démonstration ne peut pas être modifiée. Elle doit d’abord être transformée en brouillon.',
        HttpStatus.PRECONDITION_FAILED,
      );
    }
    // On verifie qu'on ne modifie pas le status sur la Bal a deja été publié
    if (
      [StatusBaseLocalEnum.PUBLISHED, StatusBaseLocalEnum.REPLACED].includes(
        baseLocale.status,
      ) &&
      update.status &&
      update.status !== baseLocale.status
    ) {
      throw new HttpException(
        'La base locale a été publiée, son statut ne peut plus être changé',
        HttpStatus.PRECONDITION_FAILED,
      );
    }
    // On met a jour la Bal
    const { affected }: UpdateResult = await this.basesLocalesRepository.update(
      { id: baseLocale.id },
      update,
    );
    // On récupère la Bal mis a jour
    const updatedBaseLocale: BaseLocale =
      await this.basesLocalesRepository.findOneBy({ id: baseLocale.id });
    // Si les mails de la Bal ont été modifié
    if (affected > 0 && update.emails) {
      // On envoie un mail au nouveau mails
      const newCollaborators = difference(update.emails, baseLocale.emails);
      const notification = createNewAdminNotificationEmail({
        baseLocale: updatedBaseLocale,
      });
      await Promise.all(
        newCollaborators.map((collaborator) =>
          this.mailerService.sendMail(notification, [collaborator]),
        ),
      );
    }
    // On retourne la Bal mis a jour
    return updatedBaseLocale;
  }

  async updateStatusToDraft(
    baseLocale: BaseLocale,
    { nom, email }: UpdateBaseLocaleDemoDTO,
  ): Promise<BaseLocale> {
    // On lance une erreur si la Bal est demo
    if (baseLocale.status !== StatusBaseLocalEnum.DEMO) {
      throw new HttpException(
        'La Base Adresse Locale n’est pas une Base Adresse Locale de démonstration.',
        HttpStatus.PRECONDITION_FAILED,
      );
    }
    // On met a jour la Bal
    const { affected }: UpdateResult = await this.basesLocalesRepository.update(
      { id: baseLocale.id },
      {
        nom,
        emails: [email],
        status: StatusBaseLocalEnum.DRAFT,
      },
    );
    // On récupère la Bal mofifié
    const updatedBaseLocale: BaseLocale =
      await this.basesLocalesRepository.findOneBy({ id: baseLocale.id });
    // On envoie un mail si la Bal a été modifié
    if (affected > 0) {
      const templateEmail = createBalCreationNotificationEmail({
        baseLocale: updatedBaseLocale,
      });
      await this.mailerService.sendMail(
        templateEmail,
        updatedBaseLocale.emails,
      );
    }
    // On retourne la Bal modifié
    return updatedBaseLocale;
  }

  async deleteOne(baseLocale: BaseLocale) {
    if (baseLocale.status === StatusBaseLocalEnum.DEMO) {
      // Si la Bal est en demo on la supprime
      await this.delete(baseLocale);
    } else {
      // Si la Bal n'est pas en demo on l'archive
      await this.softDelete(baseLocale);
    }
  }

  async delete(baseLocale: BaseLocale) {
    // On supprime la Bal
    // Par CASCADE cela va supprimer les voies, toponymes et numeros dans postgres
    await this.basesLocalesRepository.delete({ id: baseLocale.id });
  }

  async softDelete(baseLocale: BaseLocale) {
    // On archive la Bal
    await this.basesLocalesRepository.softDelete({ id: baseLocale.id });
  }

  async findAllDeletedByBal(
    baseLocale: BaseLocale,
  ): Promise<AllDeletedInBalDTO> {
    // On récupère les numeros archivés
    const numerosDeleted = await this.numeroService.findManyWithDeleted({
      balId: baseLocale.id,
      deletedAt: Not(IsNull()),
    });
    const numerosByVoieId = groupBy(numerosDeleted, 'voieId');
    // On récupère les voies archivés ou celle qui ont des numéros archivés
    const voies: any[] = await this.voieService.findManyWithDeleted([
      {
        id: In(Object.keys(numerosByVoieId)),
      },
      {
        balId: baseLocale.id,
        deletedAt: Not(IsNull()),
      },
    ]);
    // On populate les voie avec les numeros
    const voiesPopulate: Voie[] = voies.map((voie: Voie) => ({
      ...voie,
      numeros: numerosByVoieId[voie.id] || [],
    }));
    // On récupère les toponyme archivé de la bal
    const toponymes: Toponyme[] =
      await this.toponymeService.findManyWithDeleted({
        balId: baseLocale.id,
        deletedAt: Not(IsNull()),
      });
    // On retourne le voies et toponyme archivé
    return {
      voies: voiesPopulate,
      toponymes,
    };
  }

  async populate(
    baseLocale: BaseLocale,
    { voies, toponymes, numeros }: FromCsvType,
  ): Promise<BaseLocale> {
    // On supprime les numeros, vois et toponymes si il y en a
    await this.numeroService.deleteMany({ balId: baseLocale.id });
    await this.voieService.deleteMany({ balId: baseLocale.id });
    await this.toponymeService.deleteMany({ balId: baseLocale.id });
    // On import les voies, toponymes et numeros du fichier
    await this.voieService.importMany(baseLocale, voies);
    await this.toponymeService.importMany(baseLocale, toponymes);
    await this.numeroService.importMany(baseLocale, numeros);
    // On calcule les centroid des voies
    const voiesCreated: Voie[] = await this.voieService.findMany({
      balId: baseLocale.id,
    });
    await Promise.all(
      voiesCreated.map(({ id }) => this.voieService.calcCentroid(id)),
    );
    // On retourne la Bal
    return baseLocale;
  }

  async extendWithNumeros(
    baseLocale: BaseLocale,
  ): Promise<ExtendedBaseLocaleDTO> {
    // On récupère les numeros de la Bal
    const numeros = await this.numeroService.findMany(
      {
        balId: baseLocale.id,
      },
      { certifie: true, numero: true, comment: true },
    );
    // On rajoute les metas des numeros a la Bal
    return extendWithNumeros(baseLocale, numeros);
  }

  async getParcelles(basesLocale: BaseLocale): Promise<string[]> {
    // On récupère les parcelle des toponyme de la Bal
    const toponymesWithParcelles =
      await this.toponymeService.findDistinctParcelles(basesLocale.id);
    // On récupère les parcelles des numeros de la Bal
    const numerosWithParcelles = await this.numeroService.findDistinctParcelles(
      basesLocale.id,
    );
    // On concat et unifie les parcelles et on les retourne
    const parcelles = uniq([
      ...numerosWithParcelles,
      ...toponymesWithParcelles,
    ]);
    return parcelles;
  }

  async updateHabilitation(
    baseLocale: BaseLocale,
    habilitation: Habilitation,
  ): Promise<void> {
    await this.basesLocalesRepository.update(
      { id: baseLocale.id },
      { habilitationId: habilitation._id },
    );
  }

  async recoverAccess({ id, email }: RecoverBaseLocaleDTO) {
    // On créer le where de la requète
    const where: FindOptionsWhere<BaseLocale> = {
      emails: ArrayContains([email]),
      ...(id && { id }),
    };
    // On lance la requète
    const basesLocales = await this.findMany(where);
    if (basesLocales.length > 0) {
      // Si il a des Bal qui correspondent, on envoie un mail pour retouver l'accès a ses Bal
      const template = createRecoveryNotificationEmail({ basesLocales });
      await this.mailerService.sendMail(template, [email]);
    } else {
      // Si aucune Bal ne correspond, on lance un erreur
      throw new HttpException(
        'Aucune base locale ne correspond à ces critères',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async restore(baseLocale: BaseLocale) {
    // On restore la Bal
    await this.basesLocalesRepository.restore({
      id: baseLocale.id,
    });
  }

  async renewToken(baseLocale: BaseLocale) {
    // On génère un token
    const token = generateBase62String(20);
    // On update le token de la Bal dans postgres
    const { affected }: UpdateResult = await this.basesLocalesRepository.update(
      { id: baseLocale.id },
      { token },
    );
    // On récupère la Bal modifié
    const updatedBaseLocale: BaseLocale =
      await this.basesLocalesRepository.findOneBy({
        id: baseLocale.id,
      });
    // Si la Bal a été modifié on envoie un mail avec le nouveau token
    if (affected > 0) {
      const email = createTokenRenewalNotificationEmail({
        baseLocale: updatedBaseLocale,
      });

      await this.mailerService.sendMail(email, updatedBaseLocale.emails);
    }
    // On retourne la Bal mis a jour
    return updatedBaseLocale;
  }

  touch(balId: string, updatedAt: Date = new Date()) {
    return this.basesLocalesRepository.update({ id: balId }, { updatedAt });
  }
}
