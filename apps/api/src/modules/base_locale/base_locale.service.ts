import {
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  FilterQuery,
  Model,
  Types,
  QueryWithHelpers,
  Aggregate,
  PipelineStage,
} from 'mongoose';
import { uniq, difference, groupBy } from 'lodash';

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { MailerService } from '@/shared/modules/mailer/mailer.service';
import { formatEmail as createBalCreationNotificationEmail } from '@/shared/modules/mailer/templates/bal-creation-notification';
import { formatEmail as createNewAdminNotificationEmail } from '@/shared/modules/mailer/templates/new-admin-notification';
import { formatEmail as createRecoveryNotificationEmail } from '@/shared/modules/mailer/templates/recovery-notification';
import { formatEmail as createTokenRenewalNotificationEmail } from '@/shared/modules/mailer/templates/token-renewal-notification';
import { Habilitation } from '@/shared/modules/api_depot/types/habilitation.type';

import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { VoieService } from '@/modules/voie/voie.service';
import { NumeroService } from '@/modules/numeros/numero.service';
import { CreateBaseLocaleDTO } from '@/modules/base_locale/dto/create_base_locale.dto';
import { generateBase62String } from '@/lib/utils/token.utils';
import { ExtendedBaseLocaleDTO } from './dto/extended_base_locale.dto';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { Numero } from '@/shared/schemas/numero/numero.schema';
import { StatusBaseLocalEnum } from '@/shared/schemas/base_locale/status.enum';
import { UpdateBaseLocaleDTO } from './dto/update_base_locale.dto';
import { extendWithNumeros } from '@/shared/utils/numero.utils';
import { CreateDemoBaseLocaleDTO } from './dto/create_demo_base_locale.dto';
import { getCommune } from '@/shared/utils/cog.utils';
import { PopulateService } from './sub_modules/populate/populate.service';
import { UpdateBaseLocaleDemoDTO } from './dto/update_base_locale_demo.dto';
import { extractFromCsv } from '@/lib/utils/csv.utils';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { ImportFileBaseLocaleDTO } from './dto/import_file_base_locale.dto';
import { RecoverBaseLocaleDTO } from './dto/recover_base_locale.dto';
import { AllDeletedInBalDTO } from './dto/all_deleted_in_bal.dto';
import { PopulateVoie } from '@/shared/schemas/voie/voie.populate';

@Injectable()
export class BaseLocaleService {
  constructor(
    @InjectModel(BaseLocale.name) private baseLocaleModel: Model<BaseLocale>,
    private readonly mailerService: MailerService,
    @Inject(forwardRef(() => VoieService))
    private voieService: VoieService,
    @Inject(forwardRef(() => ToponymeService))
    private toponymeService: ToponymeService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
    @Inject(forwardRef(() => PopulateService))
    private populateService: PopulateService,
  ) {}

  async findOneOrFail(id: string): Promise<BaseLocale> {
    const filter = {
      _id: id,
    };
    const baseLocale = await this.baseLocaleModel.findOne(filter).lean().exec();

    if (!baseLocale) {
      throw new HttpException(
        `BaseLocale ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return baseLocale;
  }

  async findOne(filter?: FilterQuery<BaseLocale>): Promise<BaseLocale> {
    return this.baseLocaleModel.findOne(filter).lean();
  }

  async count(filter?: FilterQuery<BaseLocale>): Promise<number> {
    return this.baseLocaleModel.countDocuments(filter);
  }

  async findMany(
    filter?: FilterQuery<BaseLocale>,
    selector: Record<string, number> = null,
    limit: number = null,
    offset: number = null,
  ): Promise<BaseLocale[]> {
    const query: QueryWithHelpers<
      Array<BaseLocale>,
      BaseLocale
    > = this.baseLocaleModel.find(filter);

    if (selector) {
      query.select(selector);
    }
    if (limit) {
      query.limit(limit);
    }
    if (offset) {
      query.skip(offset);
    }

    return query.lean().exec();
  }

  async createOne(createInput: CreateBaseLocaleDTO): Promise<BaseLocale> {
    const newBaseLocale = await this.baseLocaleModel.create({
      ...createInput,
      token: generateBase62String(20),
      status: StatusBaseLocalEnum.DRAFT,
    });

    const email = createBalCreationNotificationEmail({
      baseLocale: newBaseLocale,
    });
    await this.mailerService.sendMail(email, newBaseLocale.emails);

    return newBaseLocale;
  }

  async createDemo(
    createDemoInput: CreateDemoBaseLocaleDTO,
  ): Promise<BaseLocale> {
    const { commune, populate } = createDemoInput;

    const newDemoBaseLocale = await this.baseLocaleModel.create({
      token: generateBase62String(20),
      commune,
      nom: `Adresses de ${getCommune(commune).nom} [démo]`,
      status: StatusBaseLocalEnum.DEMO,
    });

    if (populate) {
      await this.extractAndPopulate(newDemoBaseLocale);
    }

    return newDemoBaseLocale;
  }

  async extractAndPopulate(baseLocale: BaseLocale): Promise<BaseLocale> {
    const { numeros, voies, toponymes } = await this.populateService.extract(
      baseLocale.commune,
    );

    return this.populate(baseLocale, { numeros, voies, toponymes });
  }

  async importFile(
    baseLocale: BaseLocale,
    file: Buffer,
  ): Promise<ImportFileBaseLocaleDTO> {
    const { voies, numeros, toponymes, isValid, accepted, rejected } =
      await extractFromCsv(file, baseLocale.commune);

    if (!isValid) {
      throw new HttpException(
        `CSV file is not valid`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await this.populate(baseLocale, { voies, numeros, toponymes });

    await this.touch(baseLocale._id);

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
    if (baseLocale.status === StatusBaseLocalEnum.DEMO) {
      throw new HttpException(
        'Une Base Adresse Locale de démonstration ne peut pas être modifiée. Elle doit d’abord être transformée en brouillon.',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

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

    const updatedBaseLocale = await this.baseLocaleModel.findOneAndUpdate(
      { _id: baseLocale._id },
      { $set: update },
      { new: true },
    );

    // If emails fields is overrided, we compare with current array to send a notification to new email addresses
    if (update.emails) {
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

    return updatedBaseLocale;
  }

  async updateStatusToDraft(
    baseLocale: BaseLocale,
    update: UpdateBaseLocaleDemoDTO,
  ): Promise<BaseLocale> {
    if (baseLocale.status !== StatusBaseLocalEnum.DEMO) {
      throw new HttpException(
        'La Base Adresse Locale n’est pas une Base Adresse Locale de démonstration.',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const { nom, email } = update;
    const updatedBaseLocale = await this.baseLocaleModel.findOneAndUpdate(
      { _id: baseLocale._id },
      {
        $set: {
          nom,
          emails: [email],
          status: StatusBaseLocalEnum.DRAFT,
        },
      },
      { new: true },
    );

    const templateEmail = createBalCreationNotificationEmail({
      baseLocale: updatedBaseLocale,
    });
    await this.mailerService.sendMail(templateEmail, updatedBaseLocale.emails);

    return updatedBaseLocale;
  }

  async deleteOne(baseLocale: BaseLocale) {
    if (baseLocale.status === StatusBaseLocalEnum.DEMO) {
      await this.hardDeleteOne(baseLocale);
    } else {
      await this.softDeleteOne(baseLocale);
    }
  }

  async deleteData(baseLocale: BaseLocale) {
    await this.numeroService.deleteMany({
      _bal: baseLocale._id,
    });
    await this.voieService.deleteMany({ _bal: baseLocale._id });
    await this.toponymeService.deleteMany({
      _bal: baseLocale._id,
    });
  }

  async hardDeleteOne(baseLocale: BaseLocale) {
    await this.deleteData(baseLocale);
    await this.baseLocaleModel.deleteOne({ _id: baseLocale._id });
  }

  async softDeleteOne(baseLocale: BaseLocale) {
    await this.baseLocaleModel.updateOne(
      { _id: baseLocale._id },
      { $set: { _deleted: new Date() } },
    );
  }

  async aggregate(aggregation?: PipelineStage[]): Promise<Aggregate<any>> {
    return this.baseLocaleModel.aggregate(aggregation);
  }

  async findAllDeletedByBal(
    baseLocale: BaseLocale,
  ): Promise<AllDeletedInBalDTO> {
    const numerosDeleted = await this.numeroService.findMany({
      _bal: baseLocale._id,
      _deleted: { $ne: null },
    });

    const numerosByVoieId = groupBy(numerosDeleted, 'voie');
    const voies: any[] = await this.voieService.findMany({
      _bal: baseLocale._id,
      $or: [
        {
          _id: {
            $in: Object.keys(numerosByVoieId),
          },
        },
        { _deleted: { $ne: null } },
      ],
    });

    const voiesPopulate: PopulateVoie[] = [];
    for (const voie of voies) {
      const voiePopulate: PopulateVoie = {
        ...voie,
        numeros: numerosByVoieId[voie._id.toString()] || [],
      };
      voiesPopulate.push(voiePopulate);
    }

    const toponymes: Toponyme[] = await this.toponymeService.findMany({
      _bal: baseLocale._id,
      _deleted: { $ne: null },
    });
    return {
      voies: voiesPopulate,
      toponymes,
    };
  }

  async populate(
    baseLocale: BaseLocale,
    data: { voies: Voie[]; toponymes: Toponyme[]; numeros: Numero[] },
  ): Promise<BaseLocale> {
    await this.deleteData(baseLocale);

    const { voies, toponymes, numeros } = data;

    await this.voieService.importMany(baseLocale, voies);
    await this.toponymeService.importMany(baseLocale, toponymes);
    await this.numeroService.importMany(baseLocale, numeros);

    return baseLocale;
  }

  async extendWithNumeros(
    baseLocale: BaseLocale,
  ): Promise<ExtendedBaseLocaleDTO> {
    const numeros = await this.numeroService.findMany(
      {
        _bal: baseLocale._id,
        _deleted: null,
      },
      { certifie: 1, numero: 1, comment: 1 },
    );

    return extendWithNumeros(baseLocale, numeros);
  }

  async getParcelles(basesLocale: BaseLocale): Promise<string[]> {
    const toponymesWithParcelles = await this.toponymeService.findDistinct(
      {
        _bal: basesLocale._id,
        _deleted: null,
      },
      'parcelles',
    );

    const numerosWithParcelles = await this.numeroService.findDistinct(
      {
        _bal: basesLocale._id,
        _deleted: null,
      },
      'parcelles',
    );

    const parcelles = [...numerosWithParcelles, ...toponymesWithParcelles];

    return uniq(parcelles);
  }

  async updateHabilitation(
    baseLocale: BaseLocale,
    habilitation: Habilitation,
  ): Promise<void> {
    await this.baseLocaleModel.updateOne(
      { _id: baseLocale._id },
      { _habilitation: habilitation._id },
    );
  }

  async recoverAccess({ id, email }: RecoverBaseLocaleDTO) {
    const filters = {
      emails: { $regex: new RegExp(`^${email}$`, 'i') },
    } as FilterQuery<BaseLocale>;

    if (id) {
      filters._id = id;
    }

    const basesLocales = await this.findMany(filters);

    if (basesLocales.length > 0) {
      const template = createRecoveryNotificationEmail({ basesLocales });
      await this.mailerService.sendMail(template, [email]);
    } else {
      throw new HttpException(
        'Aucune base locale ne correspond à ces critères',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async recovery(baseLocale: BaseLocale) {
    const now = new Date();
    const recoveredBaseLocale = await this.baseLocaleModel.findByIdAndUpdate(
      { _id: baseLocale._id },
      { $set: { _deleted: null, _updated: now } },
      { new: true },
    );

    return recoveredBaseLocale;
  }

  async renewToken(baseLocale: BaseLocale) {
    const token = generateBase62String(20);
    const updatedBaseLocale = await this.baseLocaleModel.findByIdAndUpdate(
      { _id: baseLocale._id },
      { $set: { token } },
      { new: true },
    );

    const email = createTokenRenewalNotificationEmail({
      baseLocale: updatedBaseLocale,
    });

    await this.mailerService.sendMail(email, updatedBaseLocale.emails);

    return updatedBaseLocale;
  }

  touch(baseLocaleId: Types.ObjectId, _updated: Date = new Date()) {
    return this.baseLocaleModel.updateOne(
      { _id: baseLocaleId },
      { $set: { _updated } },
    );
  }
}
