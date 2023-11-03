import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, ProjectionType, Types } from 'mongoose';
import { groupBy } from 'lodash';

import { Voie } from '@/shared/schemas/voie/voie.schema';
import { TypeNumerotationEnum } from '@/shared/schemas/voie/type_numerotation.enum';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

import { ExtendedVoie } from '@/modules/voie/dto/extended_voie.dto';
import { UpdateVoieDto } from '@/modules/voie/dto/update_voie.dto';
import { CreateVoieDto } from '@/modules/voie/dto/create_voie.dto';
import { RestoreVoieDto } from '@/modules/voie/dto/restore_voie.dto';
import { cleanNom, cleanNomAlt } from '@/lib/utils/nom.util';
import { NumeroService } from '@/modules/numeros/numero.service';
import { TilesService } from '@/modules/base_locale/sub_modules/tiles/tiles.service';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { extendWithNumeros } from '@/shared/utils/numero.utils';

@Injectable()
export class VoieService {
  constructor(
    @InjectModel(Voie.name) private voieModel: Model<Voie>,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
    @Inject(forwardRef(() => TilesService))
    private tilesService: TilesService,
  ) {}

  async findOneOrFail(voieId: string): Promise<Voie> {
    const filter = {
      _id: voieId,
    };
    const voie = await this.voieModel.findOne(filter).exec();

    if (!voie) {
      throw new HttpException(`Voie ${voieId} not found`, HttpStatus.NOT_FOUND);
    }

    return voie;
  }

  async findMany(
    filter: FilterQuery<Voie>,
    projection?: ProjectionType<Voie>,
  ): Promise<Voie[]> {
    const query = this.voieModel.find(filter);
    if (projection) {
      query.projection(projection);
    }

    return query.exec();
  }

  public deleteMany(filters: FilterQuery<Voie>): Promise<any> {
    return this.voieModel.deleteMany(filters);
  }

  async extendVoiesWithNumeros(voies: Voie[]): Promise<ExtendedVoie[]> {
    const numeros = await this.numeroService.findMany({
      voie: { $in: voies.map(({ _id }) => _id) },
    });

    const numerosByVoies = groupBy(numeros, 'voie');
    return voies.map((voie) =>
      extendWithNumeros(voie, numerosByVoies[voie._id] || [], 'voie'),
    );
  }

  async extendVoieWithNumeros(voie: Voie): Promise<ExtendedVoie> {
    const numeros = await this.numeroService.findMany({
      voie: voie._id,
    });

    return extendWithNumeros(voie, numeros, 'voie');
  }

  public async findAllByBalId(
    balId: Types.ObjectId,
    isDelete: boolean = false,
  ): Promise<Voie[]> {
    const filter = {
      _bal: balId,
      _deleted: isDelete ? { $ne: null } : null,
    };
    return this.voieModel.find(filter).exec();
  }

  public async create(
    bal: BaseLocale,
    createVoieDto: CreateVoieDto,
  ): Promise<Voie> {
    // CREATE OBJECT VOIE
    const voie: Voie = {
      _id: new Types.ObjectId(),
      _bal: bal._id,
      commune: bal.commune,
      nom: createVoieDto.nom,
      typeNumerotation:
        createVoieDto.typeNumerotation || TypeNumerotationEnum.NUMERIQUE,
      trace: createVoieDto.trace || null,
      nomAlt: cleanNomAlt(createVoieDto.nomAlt) || null,
      centroid: null,
      centroidTiles: null,
      traceTiles: null,
      _updated: new Date(),
      _created: new Date(),
      _deleted: null,
    };
    // CALC CENTROID AND TILES IF METRIQUE
    if (voie.trace && voie.typeNumerotation === TypeNumerotationEnum.METRIQUE) {
      await this.tilesService.calcMetaTilesVoieWithTrace(voie);
    }
    // REQUEST CREATE VOIE
    const voieCreated: Voie = await this.voieModel.create(voie);
    // SET _updated BAL
    await this.baseLocaleService.touch(bal._id, voieCreated._updated);

    return voieCreated;
  }

  async updateOne(
    voieId: Types.ObjectId,
    update: Partial<Voie>,
  ): Promise<Voie> {
    return this.voieModel
      .findOneAndUpdate({ _id: voieId }, { $set: update })
      .exec();
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
    await this.baseLocaleService.touch(voieUpdated._bal, voieUpdated._updated);
    return voieUpdated;
  }

  public async delete(voie: Voie) {
    // DELETE VOIE
    const { deletedCount } = await this.voieModel.deleteOne({
      _id: voie._id,
    });

    if (deletedCount >= 1) {
      // SET _updated OF VOIE
      await this.baseLocaleService.touch(voie._bal);
      // DELETE NUMEROS OF VOIE
      await this.numeroService.deleteMany({
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
    await this.baseLocaleService.touch(voie._bal);
    // SET _deleted NUMERO FROM VOIE
    await this.numeroService.updateMany(
      { voie: voie._id },
      {
        _deleted: voieUpdated._updated,
        _updated: voieUpdated._updated,
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
    await this.baseLocaleService.touch(voie._bal);
    if (numerosIds.length > 0) {
      // SET _updated NUMERO FROM VOIE
      const { modifiedCount } = await this.numeroService.updateMany(
        { voie: voie._id, _id: { $in: numerosIds } },
        { _deleted: null, _updated: updatedVoie._updated },
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

  touch(voieId: Types.ObjectId, _updated: Date = new Date()) {
    return this.voieModel.updateOne({ _id: voieId }, { $set: { _updated } });
  }
}
