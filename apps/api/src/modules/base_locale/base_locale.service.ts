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
import { uniq, difference } from 'lodash';

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { VoieService } from '@/modules/voie/voie.service';
import { NumeroService } from '@/modules/numeros/numero.service';
import { Habilitation } from '@/modules/base_locale/sub_modules/habilitation/types/habilitation.type';
import { MailerService } from '@/modules/base_locale/sub_modules/mailer/mailer.service';
import { CreateBaseLocaleDTO } from '@/modules/base_locale/dto/create_base_locale.dto';
import { generateBase62String } from '@/lib/utils/token.utils';
import { formatEmail as createBalCreationNotificationEmail } from '@/modules/base_locale/sub_modules/mailer/templates/bal-creation-notification';
import { exportBalToCsv } from '@/lib/utils/csv_bal.utils';
import { exportVoiesToCsv } from '@/modules/base_locale/utils/csv_voies.utils';
import { ExtendedBaseLocale } from './dto/extended_base_locale';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { Numero } from '@/shared/schemas/numero/numero.schema';
import { StatusBaseLocalEnum } from '@/shared/schemas/base_locale/status.enum';
import { UpdateBaseLocaleDTO } from './dto/update_base_locale.dto';
import { formatEmail as createNewAdminNotificationEmail } from './sub_modules/mailer/templates/new-admin-notification';
import { extendWithNumeros } from '@/shared/utils/numero.utils';
import { CreateDemoBaseLocaleDTO } from './dto/create_demo_base_locale.dto';
import { getCommune } from '@/shared/utils/cog.utils';
import { PopulateService } from './sub_modules/populate/populate.service';

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
    const baseLocale = await this.baseLocaleModel.findOne(filter).exec();

    if (!baseLocale) {
      throw new HttpException(
        `BaseLocale ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return baseLocale;
  }

  async findOne(filter?: FilterQuery<BaseLocale>): Promise<BaseLocale> {
    return this.baseLocaleModel.findOne(filter);
  }

  async findMany(
    filter?: FilterQuery<BaseLocale>,
    selector: Record<string, number> = null,
  ): Promise<BaseLocale[]> {
    const query: QueryWithHelpers<
      Array<BaseLocale>,
      BaseLocale
    > = this.baseLocaleModel.find(filter);

    if (selector) {
      query.select(selector);
    }

    return query.exec();
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
      await this.populate(newDemoBaseLocale);
    }

    return newDemoBaseLocale;
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

    const numeroCount = await this.numeroService.count({
      _bal: baseLocale._id,
      _deleted: null,
    });
    if (
      numeroCount === 0 &&
      update.status === StatusBaseLocalEnum.READY_TO_PUBLISH
    ) {
      throw new HttpException(
        'La base locale ne possède aucune adresse',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const updatedBaseLocale = await this.baseLocaleModel.findOneAndUpdate(
      { _id: baseLocale._id },
      { $set: update },
      { returnDocument: 'after' },
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

  async populate(baseLocale: BaseLocale): Promise<BaseLocale> {
    await this.deleteData(baseLocale);
    // const { numeros, voies, toponymes } = await this.populateService.extract(
    //   baseLocale.commune,
    // );
    // await Promise.all([
    //   this.voieService.importMany(baseLocale._id, voies, {
    //     validate: false,
    //     keepIds: true,
    //   }),
    //   this.numeroService.importMany(baseLocale._id, numeros, {
    //     validate: false,
    //   }),
    //   this.toponymeService.importMany(baseLocale._id, toponymes, {
    //     validate: false,
    //     keepIds: true,
    //   }),
    // ]);

    return baseLocale;
  }

  async exportToCsv(baseLocale: BaseLocale): Promise<string> {
    const voies = await this.voieService.findMany({
      _bal: baseLocale._id,
      _deleted: null,
    });
    const toponymes = await this.toponymeService.findMany({
      _bal: baseLocale._id,
      _deleted: null,
    });
    const numeros = await this.numeroService.findMany({
      _bal: baseLocale._id,
      _deleted: null,
    });
    return exportBalToCsv(voies, toponymes, numeros);
  }

  async exportVoiesToCsv(baseLocale: BaseLocale): Promise<string> {
    const voies = await this.voieService.findMany({
      _bal: baseLocale._id,
      _deleted: null,
    });
    const toponymes = await this.toponymeService.findMany({
      _bal: baseLocale._id,
      _deleted: null,
    });
    const numeros = await this.numeroService.findMany({
      _bal: baseLocale._id,
      _deleted: null,
    });

    return exportVoiesToCsv(voies, toponymes, numeros);
  }

  async extendWithNumeros(baseLocale: BaseLocale): Promise<ExtendedBaseLocale> {
    const numeros = await this.numeroService.findMany(
      {
        _bal: baseLocale._id,
        _deleted: null,
      },
      { certifie: 1, numero: 1, comment: 1 },
    );

    return extendWithNumeros(baseLocale, numeros);
  }

  async getParcelles(basesLocale: BaseLocale): Promise<(Toponyme | Numero)[]> {
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

  touch(baseLocaleId: Types.ObjectId, _updated: Date = new Date()) {
    return this.baseLocaleModel.updateOne(
      { _id: baseLocaleId },
      { $set: { _updated } },
    );
  }
}
