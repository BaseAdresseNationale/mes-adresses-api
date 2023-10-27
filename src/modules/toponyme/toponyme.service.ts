import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
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
import { cleanNom, cleanNomAlt } from '@/lib/utils/nom.util';
import { UpdateToponymeDto } from './dto/update_toponyme.dto';
import { CreateToponymeDto } from './dto/create_toponyme.dto';
import { BaseLocale } from '@/modules/base_locale/schema/base_locale.schema';
import { NumeroService } from '../numeros/numero.service';
import { BaseLocaleService } from '../base_locale/base_locale.service';

@Injectable()
export class ToponymeService {
  constructor(
    @InjectModel(Toponyme.name) private toponymeModel: Model<Toponyme>,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
  ) {}

  async findOneOrFail(
    toponymeId: string,
    isDelete: boolean = false,
  ): Promise<Toponyme> {
    const filter = {
      _id: toponymeId,
      _deleted: isDelete ? { $ne: null } : null,
    };
    const toponyme = this.toponymeModel.findOne(filter).exec();

    if (!toponyme) {
      throw new HttpException(
        `Toponyme ${toponymeId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return toponyme;
  }

  async extendToponymes(toponymes: Toponyme[]): Promise<ExtentedToponyme[]> {
    const numeros = await this.numeroService.findMany({
      toponyme: { $in: toponymes.map(({ _id }) => _id) },
      _deleted: null,
    });

    const numerosByToponymes = groupBy(numeros, 'toponyme');
    return toponymes.map((t) =>
      this.getExtendToponyme(t, numerosByToponymes[t._id]),
    );
  }

  async extendToponyme(toponyme: Toponyme): Promise<ExtentedToponyme> {
    const numeros = await this.numeroService.findMany({
      toponyme: toponyme._id,
      _deleted: null,
    });

    return this.getExtendToponyme(toponyme, numeros);
  }

  public async findAllByBalId(
    balId: Types.ObjectId,
    isDelete: boolean = false,
  ): Promise<Toponyme[]> {
    const filter = {
      _bal: balId,
      _deleted: isDelete ? { $ne: null } : null,
    };
    return this.toponymeModel.find(filter).exec();
  }

  public async create(
    bal: BaseLocale,
    createToponymeDto: CreateToponymeDto,
  ): Promise<Toponyme> {
    // CREATE OBJECT TOPONYME
    const toponyme: Toponyme = {
      _id: new Types.ObjectId(),
      _bal: bal._id,
      commune: bal.commune,
      nom: createToponymeDto.nom,
      positions: createToponymeDto.positions || [],
      parcelles: createToponymeDto.parcelles || [],
      nomAlt: cleanNomAlt(createToponymeDto.nomAlt) || null,
      _updated: new Date(),
      _created: new Date(),
      _deleted: null,
    };

    // REQUEST CREATE TOPONYME
    const toponymeCreated: Toponyme = await this.toponymeModel.create(toponyme);
    // SET _updated BAL
    await this.baseLocaleService.touch(bal._id, toponymeCreated._updated);

    return toponymeCreated;
  }

  async update(
    toponyme: Toponyme,
    updateToponymeDto: UpdateToponymeDto,
  ): Promise<Toponyme> {
    if (updateToponymeDto.nom) {
      updateToponymeDto.nom = cleanNom(updateToponymeDto.nom);
    }

    if (updateToponymeDto.nomAlt) {
      updateToponymeDto.nomAlt = cleanNomAlt(updateToponymeDto.nomAlt);
    }

    const toponymeUpdated = await this.toponymeModel.findOneAndUpdate(
      { _id: toponyme._id, _deleted: null },
      { $set: { ...updateToponymeDto, _upated: new Date() } },
      { returnDocument: 'after' },
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
      { returnDocument: 'after' },
    );

    // SET _updated OF TOPONYME
    await this.baseLocaleService.touch(toponyme._bal);
    return toponymeUpdated;
  }

  public async restore(toponyme: Toponyme): Promise<Toponyme> {
    const updatedToponyme = await this.toponymeModel.findOneAndUpdate(
      { _id: toponyme._id, _deleted: null },
      { $set: { _deleted: null, _upated: new Date() } },
      { returnDocument: 'after' },
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

  touch(toponymeId: Types.ObjectId, _updated: Date = new Date()) {
    return this.toponymeModel.updateOne(
      { _id: toponymeId },
      { $set: { _updated } },
    );
  }
}
