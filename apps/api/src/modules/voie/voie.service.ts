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
import { cleanNom, cleanNomAlt, getNomAltDefault } from '@/lib/utils/nom.util';
import { NumeroService } from '@/modules/numeros/numero.service';
import { TilesService } from '@/modules/base_locale/sub_modules/tiles/tiles.service';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { extendWithNumeros } from '@/shared/utils/numero.utils';
import { Position } from '@/shared/schemas/position.schema';
import * as turf from '@turf/turf';
import bbox from '@turf/bbox';
import { Feature as FeatureTurf } from '@turf/helpers';
import { Numero } from '@/shared/schemas/numero/numero.schema';
import { BBox as BboxTurf } from '@turf/helpers';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { CreateToponymeDto } from '../toponyme/dto/create_toponyme.dto';
import {
  getTilesByLineString,
  getTilesByPosition,
} from '../base_locale/sub_modules/tiles/utils/tiles.utils';
import { getPriorityPosition } from '@/lib/utils/positions.util';
import { ZOOM } from '../base_locale/sub_modules/tiles/const/zoom.const';

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
    @Inject(forwardRef(() => ToponymeService))
    private toponymeService: ToponymeService,
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

  async extendVoies(voies: Voie[]): Promise<ExtendedVoie[]> {
    const numeros = await this.numeroService.findMany({
      voie: { $in: voies.map(({ _id }) => _id) },
    });

    const numerosByVoies = groupBy(numeros, 'voie');

    return voies.map((voie) => ({
      ...extendWithNumeros(voie, numerosByVoies[voie._id] || []),
      bbox: this.getBBOX(voie, numerosByVoies[voie._id] || []),
    }));
  }

  async extendVoie(voie: Voie): Promise<ExtendedVoie> {
    const numeros = await this.numeroService.findMany({
      voie: voie._id,
    });

    return {
      ...extendWithNumeros(voie, numeros),
      bbox: this.getBBOX(voie, numeros),
    };
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
    const voie: Partial<Voie> = {
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

  async importMany(baseLocale: BaseLocale, rawVoies: any[]) {
    const voies = rawVoies
      .map((rawVoie) => {
        if (!rawVoie.commune || !rawVoie.nom) {
          return null;
        }

        const voie = {
          _id: rawVoie._id,
          _bal: baseLocale._id,
          nom: cleanNom(rawVoie.nom),
          code: rawVoie.code || null,
          commune: rawVoie.commune,
          nomAlt: getNomAltDefault(rawVoie.nomAlt),
        } as Partial<Voie>;

        if (rawVoie._updated && rawVoie._created) {
          voie._created = rawVoie._created;
          voie._updated = rawVoie._updated;
        }

        return voie;
      })
      .filter(Boolean);

    if (voies.length === 0) {
      return;
    }

    await this.voieModel.insertMany(voies);
  }

  async updateTiles(voies: Voie[]) {
    return Promise.all(
      voies.map(async (voie) => {
        const voieSet = await this.calcMetaTilesVoie(voie);
        return this.voieModel.updateOne({ _id: voie._id }, { $set: voieSet });
      }),
    );
  }

  async calcMetaTilesVoie(voie: Voie) {
    voie.centroid = null;
    voie.centroidTiles = null;
    voie.traceTiles = null;

    try {
      if (voie.typeNumerotation === 'metrique' && voie.trace) {
        voie.centroid = turf.centroid(voie.trace);
        voie.centroidTiles = getTilesByPosition(
          voie.centroid.geometry,
          ZOOM.VOIE_ZOOM,
        );
        voie.traceTiles = getTilesByLineString(voie.trace);
      } else {
        const numeros = await this.numeroService.findMany(
          { voie: voie._id, _deleted: null },
          { positions: 1, voie: 1 },
        );
        if (numeros.length > 0) {
          const coordinatesNumeros = numeros
            .filter((n) => n.positions && n.positions.length > 0)
            .map((n) => getPriorityPosition(n.positions)?.point?.coordinates);
          // CALC CENTROID
          if (coordinatesNumeros.length > 0) {
            const featureCollection = turf.featureCollection(
              coordinatesNumeros.map((n) => turf.point(n)),
            );
            voie.centroid = turf.centroid(featureCollection);
            voie.centroidTiles = getTilesByPosition(
              voie.centroid.geometry,
              ZOOM.VOIE_ZOOM,
            );
          }
        }
      }
    } catch (error) {
      console.error(error, voie);
    }

    return voie;
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

  getBBOX(voie: Voie, numeros: Numero[]): BboxTurf {
    const allPositions: Position[] = numeros
      .filter((n) => n.positions && n.positions.length > 0)
      .reduce((acc, n) => [...acc, ...n.positions], []);

    if (allPositions.length > 0) {
      const features: FeatureTurf[] = allPositions.map(({ point }) =>
        turf.feature(point),
      );
      const featuresCollection = turf.featureCollection(features);
      return bbox(featuresCollection);
    } else if (
      voie.trace &&
      voie.typeNumerotation === TypeNumerotationEnum.NUMERIQUE
    ) {
      return bbox(voie.trace);
    }
  }

  async convertToToponyme(voie: Voie): Promise<Toponyme> {
    if (!this.isVoieExist(voie._id)) {
      throw new HttpException(
        `Voie ${voie._id} is deleted`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const numerosCount: number = await this.numeroService.count({
      voie: voie._id,
      _deleted: null,
    });
    if (numerosCount > 0) {
      throw new HttpException(
        `Voie ${voie._id} has numero(s)`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const baseLocale = await this.baseLocaleService.findOneOrFail(
      voie._bal.toString(),
    );

    // CREATE TOPONYME
    const payload: CreateToponymeDto = {
      nom: voie.nom,
      nomAlt: voie.nomAlt,
    };
    const toponyme: Toponyme = await this.toponymeService.create(
      baseLocale,
      payload,
    );
    // DELETE VOIE
    await this.delete(voie);
    // RETURN NEW TOPONYME
    return toponyme;
  }

  touch(voieId: Types.ObjectId, _updated: Date = new Date()) {
    return this.voieModel.updateOne({ _id: voieId }, { $set: { _updated } });
  }
}
