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
  ) {}

  async findOneOrFail(id: string): Promise<BaseLocale> {
    const filter = {
      _id: id,
    };
    const baseLocale = this.baseLocaleModel.findOne(filter).exec();

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

  async aggregate(aggregation?: PipelineStage[]): Promise<Aggregate<any>> {
    return this.baseLocaleModel.aggregate(aggregation);
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

  async createOne(createInput: CreateBaseLocaleDTO): Promise<BaseLocale> {
    const newBaseLocale = await this.baseLocaleModel.create({
      ...createInput,
      token: generateBase62String(20),
      status: 'draft',
    });

    const email = createBalCreationNotificationEmail({
      baseLocale: newBaseLocale,
    });
    await this.mailerService.sendMail(email, newBaseLocale.emails);

    return newBaseLocale;
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
