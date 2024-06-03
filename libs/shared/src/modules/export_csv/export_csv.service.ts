import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Numero } from '@/shared/schemas/numero/numero.schema';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { exportBalToCsv } from '@/shared/modules/export_csv/utils/export_csv_bal.utils';
import { exportVoiesToCsv } from '@/shared/modules/export_csv/utils/export_csv_voies.utils';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

@Injectable()
export class ExportCsvService {
  constructor(
    @InjectModel(Numero.name) private numeroModel: Model<Numero>,
    @InjectModel(Voie.name) private voieModel: Model<Voie>,
    @InjectModel(Toponyme.name) private toponymeModel: Model<Toponyme>,
  ) {}

  async getAllFromBal(balId: Types.ObjectId) {
    const voies: Voie[] = await this.voieModel.find({
      _bal: balId,
      _deleted: null,
    });
    const toponymes: Toponyme[] = await this.toponymeModel.find({
      _bal: balId,
      _deleted: null,
    });
    const numeros: Numero[] = await this.numeroModel.find({
      _bal: balId,
      _deleted: null,
    });
    return { voies, toponymes, numeros };
  }

  async exportToCsv(
    baseLocale: BaseLocale,
    withComment: boolean = false,
  ): Promise<string> {
    const { voies, toponymes, numeros } = await this.getAllFromBal(
      baseLocale._id,
    );

    return exportBalToCsv(baseLocale, voies, toponymes, numeros, withComment);
  }

  async exportVoiesToCsv(baseLocale: BaseLocale): Promise<string> {
    const { voies, toponymes, numeros } = await this.getAllFromBal(
      baseLocale._id,
    );

    return exportVoiesToCsv(voies, toponymes, numeros);
  }
}
