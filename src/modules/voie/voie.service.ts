import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import bbox from '@turf/bbox';
import * as turf from '@turf/turf';
import { Voie } from './schema/voie.schema';
import { TypeNumerotationEnum } from './schema/type_numerotation.enum';
import { NumeroService } from '@/modules/numeros/numero.service';
import { VoieExtends } from './dto/voie.extends.dto';

@Injectable()
export class VoieService {
  constructor(
    @InjectModel(Voie.name) private voieModel: Model<Voie>,
    private numeroService: NumeroService,
  ) {}

  async extendVoie(voie: Voie): Promise<VoieExtends> {
    const numeros = await this.numeroService.findAllByVoieId(voie._id);
    const voieExtended: VoieExtends = voie;

    voieExtended.nbNumeros = numeros.length;
    voieExtended.nbNumerosCertifies = numeros.filter(
      (n) => n.certifie === true,
    ).length;
    voieExtended.isAllCertified =
      voieExtended.nbNumeros > 0 &&
      voieExtended.nbNumeros === voieExtended.nbNumerosCertifies;
    voieExtended.commentedNumeros = numeros.filter(
      (n) => n.comment !== undefined && n.comment !== null && n.comment !== '',
    );

    const positions = numeros
      .filter((n) => n.positions && n.positions.length > 0)
      .reduce((acc, n) => [...acc, ...n.positions], []);
    if (positions.length > 0) {
      const featuresCollection = turf.featureCollection(positions);
      voieExtended.bbox = bbox(featuresCollection);
    } else if (
      voieExtended.trace &&
      voieExtended.typeNumerotation === TypeNumerotationEnum.NUMERIQUE
    ) {
      voieExtended.bbox = bbox(voieExtended.trace);
    }
    return voieExtended;
  }

  async isVoieExist(
    _id: Types.ObjectId,
    _bal: Types.ObjectId = null,
  ): Promise<boolean> {
    const query = { _id, _deleted: null };
    if (_bal) {
      query['_bal'] = _bal;
    }
    const voieExist = await this.voieModel.exists(query).exec();
    return voieExist !== null;
  }
}
