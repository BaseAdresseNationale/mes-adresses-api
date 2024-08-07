import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { FilterQuery, Model, ProjectionType, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { groupBy } from 'lodash';
import { v4 as uuid } from 'uuid';

import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

import { ExtentedToponymeDTO } from '@/modules/toponyme/dto/extended_toponyme.dto';
import { cleanNom, cleanNomAlt, getNomAltDefault } from '@/lib/utils/nom.util';
import { UpdateToponymeDTO } from '@/modules/toponyme/dto/update_toponyme.dto';
import { CreateToponymeDTO } from '@/modules/toponyme/dto/create_toponyme.dto';
import { NumeroService } from '@/modules/numeros/numero.service';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { extendWithNumeros } from '@/shared/utils/numero.utils';
import { Position } from '@/shared/schemas/position.schema';
import * as turf from '@turf/turf';
import bbox from '@turf/bbox';
import { Feature as FeatureTurf, BBox as BboxTurf } from '@turf/helpers';
import { Numero } from '@/shared/schemas/numero/numero.schema';

@Injectable()
export class ToponymeService {
  constructor(
    @InjectModel(Toponyme.name) private toponymeModel: Model<Toponyme>,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
  ) {}

  async findOneOrFail(toponymeId: string): Promise<Toponyme> {
    const filter = {
      _id: toponymeId,
    };
    const toponyme = await this.toponymeModel.findOne(filter).lean().exec();

    if (!toponyme) {
      throw new HttpException(
        `Toponyme ${toponymeId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return toponyme;
  }

  async findMany(
    filter: FilterQuery<Toponyme>,
    projection: ProjectionType<Toponyme> = null,
  ): Promise<Toponyme[]> {
    const query = this.toponymeModel.find(filter);
    if (projection) {
      query.projection(projection);
    }

    return query.lean().exec();
  }

  async findDistinct(
    filter: FilterQuery<Toponyme>,
    field: string,
  ): Promise<string[]> {
    return this.toponymeModel.distinct(field, filter).exec();
  }

  public deleteMany(filters: FilterQuery<Toponyme>): Promise<any> {
    return this.toponymeModel.deleteMany(filters);
  }

  async extendToponymes(toponymes: Toponyme[]): Promise<ExtentedToponymeDTO[]> {
    const numeros = await this.numeroService.findMany({
      toponyme: { $in: toponymes.map(({ _id }) => _id) },
      _deleted: null,
    });

    const numerosByToponymes = groupBy(numeros, 'toponyme');

    return toponymes.map((voie) => ({
      ...extendWithNumeros(voie, numerosByToponymes[voie._id] || []),
      bbox: this.getBBOX(voie, numerosByToponymes[voie._id] || []),
    }));
  }

  async extendToponyme(toponyme: Toponyme): Promise<ExtentedToponymeDTO> {
    const numeros = await this.numeroService.findMany({
      toponyme: toponyme._id,
      _deleted: null,
    });

    return {
      ...extendWithNumeros(toponyme, numeros),
      bbox: this.getBBOX(toponyme, numeros),
    };
  }

  public async create(
    bal: BaseLocale,
    createToponymeDto: CreateToponymeDTO | Partial<Toponyme>,
  ): Promise<Toponyme> {
    // CREATE OBJECT TOPONYME
    const toponyme: Partial<Toponyme> = {
      _bal: bal._id,
      banId: uuid(),
      commune: bal.commune,
      nom: createToponymeDto.nom,
      positions: createToponymeDto.positions || [],
      parcelles: createToponymeDto.parcelles || [],
      nomAlt: createToponymeDto.nomAlt
        ? cleanNomAlt(createToponymeDto.nomAlt)
        : null,
    };

    // REQUEST CREATE TOPONYME
    const toponymeCreated: Toponyme = await this.toponymeModel.create(toponyme);
    // SET _updated BAL
    await this.baseLocaleService.touch(bal._id, toponymeCreated._updated);

    return toponymeCreated;
  }

  async update(
    toponyme: Toponyme,
    updateToponymeDto: UpdateToponymeDTO,
  ): Promise<Toponyme> {
    if (updateToponymeDto.nom) {
      updateToponymeDto.nom = cleanNom(updateToponymeDto.nom);
    }

    if (updateToponymeDto.nomAlt) {
      updateToponymeDto.nomAlt = cleanNomAlt(updateToponymeDto.nomAlt);
    }

    const toponymeUpdated = await this.toponymeModel.findOneAndUpdate(
      { _id: toponyme._id, _deleted: null },
      { $set: { ...updateToponymeDto, _updated: new Date() } },
      { new: true },
    );

    // SET _updated BAL
    await this.baseLocaleService.touch(
      toponymeUpdated._bal,
      toponymeUpdated._updated,
    );
    return toponymeUpdated;
  }

  public async softDelete(toponyme: Toponyme): Promise<Toponyme> {
    // SET _deleted OF TOPONYME
    const toponymeUpdated: Toponyme = await this.toponymeModel.findOneAndUpdate(
      { _id: toponyme._id },
      { $set: { _deleted: new Date(), _updated: new Date() } },
      { new: true },
    );

    await this.numeroService.updateMany(
      { toponyme: toponyme._id },
      {
        toponyme: null,
        _updated: toponymeUpdated._updated,
      },
    );

    // SET _updated OF TOPONYME
    await this.baseLocaleService.touch(toponyme._bal);
    return toponymeUpdated;
  }

  public async restore(toponyme: Toponyme): Promise<Toponyme> {
    const updatedToponyme = await this.toponymeModel.findOneAndUpdate(
      { _id: toponyme._id },
      { $set: { _deleted: null, _updated: new Date() } },
      { new: true },
    );
    // SET _updated OF TOPONYME
    await this.baseLocaleService.touch(toponyme._bal);

    return updatedToponyme;
  }

  public async delete(toponyme: Toponyme) {
    // DELETE TOPONYME
    const { deletedCount } = await this.toponymeModel.deleteOne({
      _id: toponyme._id,
    });

    if (deletedCount >= 1) {
      // SET _updated OF TOPONYME
      await this.baseLocaleService.touch(toponyme._bal);
    }
  }

  async importMany(baseLocale: BaseLocale, rawToponymes: any[]) {
    const toponymes = rawToponymes
      .map((rawToponyme) => {
        if (!rawToponyme.commune || !rawToponyme.nom) {
          return null;
        }

        const toponyme = {
          _id: rawToponyme._id,
          _bal: baseLocale._id,
          banId: rawToponyme.banId || uuid(),
          nom: cleanNom(rawToponyme.nom),
          positions: rawToponyme.positions || [],
          parcelles: rawToponyme.parcelles || [],
          code: rawToponyme.code || null,
          commune: rawToponyme.commune,
          nomAlt: getNomAltDefault(rawToponyme.nomAlt),
        } as Partial<Toponyme>;

        if (rawToponyme._updated && rawToponyme._created) {
          toponyme._created = rawToponyme._created;
          toponyme._updated = rawToponyme._updated;
        }

        return toponyme;
      })
      .filter(Boolean);

    if (toponymes.length === 0) {
      return;
    }

    await this.toponymeModel.insertMany(toponymes);
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

  getBBOX(toponyme: Toponyme, numeros: Numero[]): BboxTurf {
    const allPositions: Position[] = numeros
      .filter((n) => n.positions && n.positions.length > 0)
      .reduce((acc, n) => [...acc, ...n.positions], []);

    if (allPositions.length > 0) {
      const features: FeatureTurf[] = allPositions.map(({ point }) =>
        turf.feature(point),
      );
      const featuresCollection = turf.featureCollection(features);

      return bbox(featuresCollection);
    } else if (toponyme.positions && toponyme.positions.length > 0) {
      const features: FeatureTurf[] = toponyme.positions.map(({ point }) =>
        turf.feature(point),
      );
      const featuresCollection = turf.featureCollection(features);

      return bbox(featuresCollection);
    }
  }

  touch(toponymeId: Types.ObjectId, _updated: Date = new Date()) {
    return this.toponymeModel.updateOne(
      { _id: toponymeId },
      { $set: { _updated } },
    );
  }
}
