import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { groupBy } from 'lodash';
import {
  DeleteResult,
  FindOptionsSelect,
  FindOptionsWhere,
  In,
  Repository,
  UpdateResult,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as turf from '@turf/turf';
import bbox from '@turf/bbox';
import { Feature as FeatureTurf } from '@turf/helpers';
import { BBox as BboxTurf } from '@turf/helpers';

import { Toponyme } from '@/shared/entities/toponyme.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { extendWithNumeros } from '@/shared/utils/numero.utils';
import { Position } from '@/shared/schemas/position.schema';

import { ExtentedToponymeDTO } from '@/modules/toponyme/dto/extended_toponyme.dto';
import { cleanNom, cleanNomAlt, getNomAltDefault } from '@/lib/utils/nom.util';
import { UpdateToponymeDTO } from '@/modules/toponyme/dto/update_toponyme.dto';
import { CreateToponymeDTO } from '@/modules/toponyme/dto/create_toponyme.dto';
import { NumeroService } from '@/modules/numeros/numero.service';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';

@Injectable()
export class ToponymeService {
  constructor(
    @InjectRepository(Toponyme)
    private toponymesRepository: Repository<Toponyme>,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
  ) {}

  async findOneOrFail(toponymeId: string): Promise<Toponyme> {
    // Créer le filtre where et lance la requète postgres
    const where: FindOptionsWhere<Toponyme> = {
      id: toponymeId,
    };
    const toponyme = await this.toponymesRepository.findOne({ where });
    // Si le toponyme n'existe pas, on throw une erreur
    if (!toponyme) {
      throw new HttpException(
        `Toponyme ${toponymeId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return toponyme;
  }

  async findMany(
    where: FindOptionsWhere<Toponyme>,
    select?: FindOptionsSelect<Toponyme>,
  ): Promise<Toponyme[]> {
    return this.toponymesRepository.find({ where, select });
  }

  async findDistinct(
    where: FindOptionsWhere<Toponyme>,
    field: string,
  ): Promise<string[]> {
    return this.toponymesRepository
      .createQueryBuilder()
      .select(field)
      .where(where)
      .distinctOn([field])
      .getRawMany();
  }

  async extendToponymes(toponymes: Toponyme[]): Promise<ExtentedToponymeDTO[]> {
    // On recupère les numeros des toponymes
    const toponymesIds: string[] = toponymes.map(({ id }) => id);
    const numeros = await this.numeroService.findMany({
      toponymeId: In(toponymesIds),
      deletedAt: null,
    });
    const numerosByToponymes = groupBy(numeros, 'toponyme');
    // On renvoie les toponyme avec la bbox et les metas numeros
    return toponymes.map((t) => ({
      ...extendWithNumeros(t, numerosByToponymes[t.id] || []),
      bbox: this.getBBOX(t, numerosByToponymes[t.id] || []),
    }));
  }

  async extendToponyme(toponyme: Toponyme): Promise<ExtentedToponymeDTO> {
    // On recupère les numeros du toponymes
    const numeros = await this.numeroService.findMany({
      toponymeId: toponyme.id,
      deletedAt: null,
    });
    // On renvoie le toponyme avec la bbox et les metas numeros
    return {
      ...extendWithNumeros(toponyme, numeros),
      bbox: this.getBBOX(toponyme, numeros),
    };
  }

  public async create(
    bal: BaseLocale,
    createToponymeDto: CreateToponymeDTO,
  ): Promise<Toponyme> {
    // On créer l'object toponyme
    const toponyme: Partial<Toponyme> = {
      id: bal.id,
      nom: createToponymeDto.nom,
      nomAlt: createToponymeDto.nomAlt
        ? cleanNomAlt(createToponymeDto.nomAlt)
        : null,
      positions: createToponymeDto.positions || [],
      parcelles: createToponymeDto.parcelles || [],
    };
    // On insert le toponyme dans postgres
    const toponymeCreated: Toponyme =
      await this.toponymesRepository.create(toponyme);
    // On met a jour le updatedAt de la BAL
    await this.baseLocaleService.touch(bal.id, toponymeCreated.updatedAt);
    // On retourne le toponyme créé
    return toponymeCreated;
  }

  async update(
    toponyme: Toponyme,
    updateToponymeDto: UpdateToponymeDTO,
  ): Promise<Toponyme> {
    // On clean le nom et le nomAlt si ils sont présent dans le dto
    if (updateToponymeDto.nom) {
      updateToponymeDto.nom = cleanNom(updateToponymeDto.nom);
    }
    if (updateToponymeDto.nomAlt) {
      updateToponymeDto.nomAlt = cleanNomAlt(updateToponymeDto.nomAlt);
    }
    // On update le toponyme dans postgres
    const { affected }: UpdateResult = await this.toponymesRepository.update(
      {
        id: toponyme.id,
        deletedAt: null,
      },
      updateToponymeDto,
    );
    // On met a jour le updatedAt de la BAL si le toponyme a été mis a jour
    if (affected > 0) {
      await this.baseLocaleService.touch(toponyme.balId);
    }
    // On retourne le toponyme mis a jour
    return this.toponymesRepository.findOneBy({
      id: toponyme.id,
      deletedAt: null,
    });
  }

  public async softDelete(toponyme: Toponyme): Promise<Toponyme> {
    // On archive le toponyme
    const { affected }: UpdateResult =
      await this.toponymesRepository.softDelete({
        id: toponyme.id,
      });
    // Si le toponyme a bien été archivé
    if (affected) {
      // On détache le numéro qui appartenait a ce toponyme
      await this.numeroService.updateMany(
        { toponymeId: toponyme.id },
        {
          toponymeId: null,
        },
      );
      // On met a jour le updatedAt de la BAL
      await this.baseLocaleService.touch(toponyme.balId);
    }
    // On retourne le toponyme archivé
    return this.toponymesRepository.findOneBy({
      id: toponyme.id,
    });
  }

  public async restore(toponyme: Toponyme): Promise<Toponyme> {
    // On rétabli le toponyme
    const { affected }: UpdateResult = await this.toponymesRepository.restore({
      id: toponyme.id,
    });
    // Si le toponyme a été rétabli on met a jour le updateAt de la BAL
    if (affected) {
      await this.baseLocaleService.touch(toponyme.balId);
    }
    // On retourne le toponyme rétabli
    return this.toponymesRepository.findOneBy({
      id: toponyme.id,
    });
  }

  public async delete(toponyme: Toponyme) {
    // On supprime le toponyme
    const { affected }: DeleteResult = await this.toponymesRepository.delete({
      id: toponyme.id,
    });
    // Si le toponyme a été supprimer on met a jour le updateAt de la BAL
    if (affected > 0) {
      await this.baseLocaleService.touch(toponyme.balId);
    }
  }

  public async deleteMany(where: FindOptionsWhere<Toponyme>) {
    // On supprime les toponyme
    await this.toponymesRepository.delete(where);
  }

  async importMany(baseLocale: BaseLocale, rawToponymes: any[]) {
    const toponymes = rawToponymes
      .map((rawToponyme) => {
        if (!rawToponyme.commune || !rawToponyme.nom) {
          return null;
        }

        const toponyme = {
          id: rawToponyme.id,
          balId: baseLocale.id,
          nom: cleanNom(rawToponyme.nom),
          positions: rawToponyme.positions || [],
          parcelles: rawToponyme.parcelles || [],
          code: rawToponyme.code || null,
          commune: rawToponyme.commune,
          nomAlt: getNomAltDefault(rawToponyme.nomAlt),
        } as Partial<Toponyme>;

        if (rawToponyme._updated && rawToponyme._created) {
          toponyme.createdAt = rawToponyme._created;
          toponyme.updatedAt = rawToponyme._updated;
        }

        return toponyme;
      })
      .filter(Boolean);

    if (toponymes.length === 0) {
      return;
    }

    await this.toponymeModel.insertMany(toponymes);
  }

  public async isToponymeExist(
    id: string,
    balId: string = null,
  ): Promise<boolean> {
    // On créer le where avec id et balId et lance la requète
    const where: FindOptionsWhere<Toponyme> = { id, deletedAt: null };
    if (balId) {
      where.balId = balId;
    }
    return this.toponymesRepository.exists({ where });
  }

  getBBOX(toponyme: Toponyme, numeros: Numero[]): BboxTurf {
    // On concat toutes les positions de tous les numeros
    const allPositions: Position[] = numeros
      .filter((n) => n.positions && n.positions.length > 0)
      .reduce((acc, n) => [...acc, ...n.positions], []);

    if (allPositions.length > 0) {
      // On créer une feature collection avec toutes les positions des numeros
      const features: FeatureTurf[] = allPositions.map(({ point }) =>
        turf.feature(point),
      );
      const featuresCollection = turf.featureCollection(features);
      // On renvoie la bbox de la feature collection
      return bbox(featuresCollection);
    } else if (toponyme.positions && toponyme.positions.length > 0) {
      // On créer une feature collection avec toutes les positions du toponyme
      const features: FeatureTurf[] = toponyme.positions.map(({ point }) =>
        turf.feature(point),
      );
      const featuresCollection = turf.featureCollection(features);
      // On renvoie la bbox de la feature collection
      return bbox(featuresCollection);
    }
  }

  touch(toponymeId: string, updatedAt: Date = new Date()) {
    return this.toponymesRepository.update({ id: toponymeId }, { updatedAt });
  }
}
