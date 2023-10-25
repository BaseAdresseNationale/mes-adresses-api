import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import bbox from '@turf/bbox';
import * as turf from '@turf/turf';
import { groupBy } from 'lodash';
import { Toponyme } from './schema/toponyme.schema';
import { ExtentedToponyme } from './dto/extended_toponyme.dto';
import { Numero } from '@/modules/numeros/schema/numero.schema';
import { Position } from '@/lib/schemas/position.schema';
import { Feature as FeatureTurf } from '@turf/helpers';

@Injectable()
export class ToponymeService {
  constructor(
    @InjectModel(Toponyme.name) private toponymeModel: Model<Toponyme>,
    // BUG DEPENDANCE CIRCULAR
    @InjectModel(Numero.name) private numeroModel: Model<Numero>,
  ) {}

  async extendToponyms(toponymes: Toponyme[]): Promise<ExtentedToponyme[]> {
    // BUG DEPENDANCE CIRCULAR
    const numeros = await this.numeroModel
      .find({ voie: { $in: toponymes.map(({ _id }) => _id) }, _deleted: null })
      .exec();

    const numerosByVoies = groupBy(numeros, 'voie');
    return toponymes.map((voie) =>
      this.getExtendToponyme(voie, numerosByVoies[voie._id]),
    );
  }

  async extendToponyme(toponyme: Toponyme): Promise<ExtentedToponyme> {
    // BUG DEPENDANCE CIRCULAR
    const numeros = await this.numeroModel
      .find({ voie: toponyme._id, _deleted: null })
      .exec();
    return this.getExtendToponyme(toponyme, numeros);
  }

  private getExtendToponyme(
    toponyme: Toponyme,
    numeros: Numero[],
  ): ExtentedToponyme {
    const toponymeExtended: ExtentedToponyme = toponyme;

    toponymeExtended.nbNumeros = numeros.length;
    toponymeExtended.nbNumerosCertifies = numeros.filter(
      (n) => n.certifie === true,
    ).length;
    toponymeExtended.isAllCertified =
      toponymeExtended.nbNumeros > 0 &&
      toponymeExtended.nbNumeros === toponymeExtended.nbNumerosCertifies;
    toponymeExtended.commentedNumeros = numeros.filter(
      (n) => n.comment !== undefined && n.comment !== null && n.comment !== '',
    );

    const allPositions: Position[] = numeros
      .filter((n) => n.positions && n.positions.length > 0)
      .reduce((acc, n) => [...acc, ...n.positions], []);

    if (allPositions.length > 0) {
      const features: FeatureTurf[] = allPositions.map(({ point }) =>
        turf.feature(point),
      );
      const featuresCollection = turf.featureCollection(features);
      toponymeExtended.bbox = bbox(featuresCollection);
    } else if (
      toponymeExtended.positions &&
      toponymeExtended.positions.length > 0
    ) {
      const features: FeatureTurf[] = toponymeExtended.positions.map(
        ({ point }) => turf.feature(point),
      );
      const featuresCollection = turf.featureCollection(features);
      toponymeExtended.bbox = bbox(featuresCollection);
    }
    return toponymeExtended;
  }

  async isToponymeExist(
    _id: Types.ObjectId,
    _bal: Types.ObjectId = null,
  ): Promise<boolean> {
    const query = { _id, _deleted: null };
    if (_bal) {
      query['_bal'] = _bal;
    }
    const toponymeExist = await this.toponymeModel.exists(query).exec();
    return toponymeExist !== null;
  }
}
