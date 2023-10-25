import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import bbox from '@turf/bbox';
import * as turf from '@turf/turf';
import { Voie } from './schema/voie.schema';
import { Numero } from '@/modules/numeros/schema/numero.schema';
import { TypeNumerotationEnum } from './schema/type_numerotation.enum';
import { ExtentedVoie } from './dto/extended_voie.dto';
import { UpdateVoieDto } from './dto/update_voie.dto';
import { RestoreVoieDto } from './dto/restore_voie.dto';
import { cleanNom, cleanNomAlt } from '@/lib/utils/nom.util';
import { TilesService } from '@/lib/tiles/tiles.services';
import { DbService } from '@/lib/db/db.service';

@Injectable()
export class VoieService {
  constructor(
    @InjectModel(Voie.name) private voieModel: Model<Voie>,
    @InjectModel(Numero.name) private numeroModel: Model<Numero>,
    private tilesService: TilesService,
    private dbService: DbService,
  ) {}

  async extendVoie(voie: Voie): Promise<ExtentedVoie> {
    const numeros = await this.findAllByVoieId(voie._id);
    const voieExtended: ExtentedVoie = voie;

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

  public async findAllByVoieId(voieId: Types.ObjectId): Promise<Numero[]> {
    return this.numeroModel.find({ voie: voieId, _deleted: null }).exec();
  }

  async update(voie: Voie, updateVoieDto: UpdateVoieDto): Promise<Voie> {
    if (updateVoieDto.nom) {
      updateVoieDto.nom = cleanNom(updateVoieDto.nom);
    }

    if (updateVoieDto.nomAlt) {
      updateVoieDto.nomAlt = cleanNomAlt(updateVoieDto.nomAlt);
    }

    const voieUpdated = await this.voieModel.findOneAndUpdate(
      { _id: voie._id, _deleted: null },
      { $set: { ...updateVoieDto, _upated: new Date() } },
      { returnDocument: 'after' },
    );

    // SET TILES OF VOIES
    await this.tilesService.updateVoieTiles(voieUpdated);
    // SET _updated BAL
    await this.dbService.touchBal(voieUpdated._bal, voieUpdated._updated);
    return voieUpdated;
  }

  public async delete(voie: Voie) {
    // DELETE VOIE
    const { deletedCount } = await this.voieModel.deleteOne({
      _id: voie._id,
    });

    if (deletedCount >= 1) {
      // SET _updated OF VOIE
      await this.dbService.touchBal(voie._bal);
      // DELETE NUMEROS OF VOIE
      await this.numeroModel.deleteMany({
        voie: voie._id,
        _bal: voie._bal,
      });
    }
  }

  public async softDelete(voie: Voie): Promise<Voie> {
    // SET _deleted OF VOIE
    const voieUpdated: Voie = await this.voieModel.findOneAndUpdate(
      { _id: voie._id },
      { $set: { _deleted: new Date(), _updated: new Date() } },
      { returnDocument: 'after' },
    );

    // SET _updated OF VOIE
    await this.dbService.touchBal(voie._bal);
    // SET _deleted NUMERO FROM VOIE
    await this.numeroModel.updateMany(
      { voie: voie._id },
      {
        $set: {
          _deleted: voieUpdated._updated,
          _updated: voieUpdated._updated,
        },
      },
    );
    return voieUpdated;
  }

  public async restore(
    voie: Voie,
    { numerosIds }: RestoreVoieDto,
  ): Promise<Voie> {
    const updatedVoie = await this.voieModel.findOneAndUpdate(
      { _id: voie._id, _deleted: null },
      { $set: { _deleted: null, _upated: new Date() } },
      { returnDocument: 'after' },
    );
    // SET _updated OF VOIE
    await this.dbService.touchBal(voie._bal);
    if (numerosIds.length > 0) {
      // SET _updated NUMERO FROM VOIE
      const { modifiedCount } = await this.numeroModel.updateMany(
        { voie: voie._id, _id: { $in: numerosIds } },
        { $set: { _deleted: null, _updated: updatedVoie._updated } },
      );
      if (modifiedCount > 0) {
        await this.tilesService.updateVoieTiles(updatedVoie);
      }
    }

    return updatedVoie;
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
