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
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as turf from '@turf/turf';
import bbox from '@turf/bbox';
import { Feature as FeatureTurf, BBox as BboxTurf } from '@turf/helpers';
import { v4 as uuid } from 'uuid';

import { Toponyme } from '@/shared/entities/toponyme.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { extendWithNumeros } from '@/shared/utils/numero.utils';
import { Position } from '@/shared/entities/position.entity';

import { cleanNom, cleanNomAlt, getNomAltDefault } from '@/lib/utils/nom.util';
import { ExtentedToponymeDTO } from '@/modules/toponyme/dto/extended_toponyme.dto';
import { UpdateToponymeDTO } from '@/modules/toponyme/dto/update_toponyme.dto';
import { CreateToponymeDTO } from '@/modules/toponyme/dto/create_toponyme.dto';
import { NumeroService } from '@/modules/numeros/numero.service';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { ObjectId } from 'mongodb';
import { ToponymeInBox } from '@/lib/types/toponyme.type';
import { EventService } from '@/modules/event/event.service';
import {
  EventActionEnum,
  EventEntityTypeEnum,
} from '@/shared/entities/event.entity';
import { serializeToponyme } from '@/modules/event/serializers/toponyme.serializer';
import { serializePosition } from '@/modules/event/serializers/position.serializer';
import { emitPositionDiffEvents } from '@/modules/event/position-diff.util';
import { payloadsAreEqual } from '@/modules/event/payload-diff.util';

@Injectable()
export class ToponymeService {
  constructor(
    @InjectRepository(Toponyme)
    private toponymesRepository: Repository<Toponyme>,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
    private eventService: EventService,
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
    return this.toponymesRepository.find({ where, ...(select && { select }) });
  }

  async findDistinctParcelles(balId: string): Promise<string[]> {
    const res: any[] = await this.toponymesRepository.query(
      `SELECT ARRAY_AGG(distinct elem)
        FROM (select unnest(parcelles) as elem, bal_id from toponymes) s
        WHERE bal_id = '${balId}'`,
    );
    return res[0]?.array_agg || [];
  }

  async extendToponymes(toponymes: Toponyme[]): Promise<ExtentedToponymeDTO[]> {
    // On recupère les numeros des toponymes
    const toponymesIds: string[] = toponymes.map(({ id }) => id);
    const numeros = await this.numeroService.findMany({
      toponymeId: In(toponymesIds),
    });
    const numerosByToponymes = groupBy(numeros, 'toponymeId');
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
    });
    // On renvoie le toponyme avec la bbox et les metas numeros
    return {
      ...extendWithNumeros(toponyme, numeros),
      bbox: this.getBBOX(toponyme, numeros),
    };
  }

  public async create(
    bal: BaseLocale,
    createToponymeDto: CreateToponymeDTO | Partial<Toponyme>,
  ): Promise<Toponyme> {
    // On créer l'object toponyme
    const toponyme: Partial<Toponyme> = {
      balId: bal.id,
      banId: uuid(),
      nom: createToponymeDto.nom,
      nomAlt: createToponymeDto.nomAlt
        ? cleanNomAlt(createToponymeDto.nomAlt)
        : null,
      communeDeleguee: createToponymeDto.communeDeleguee || null,
      positions: createToponymeDto.positions || [],
      parcelles: createToponymeDto.parcelles || [],
    };
    // Créer l'entité typeorm
    const entityToSave: Toponyme = this.toponymesRepository.create(toponyme);
    // On insert l'object dans postgres
    const toponymeCreated: Toponyme =
      await this.toponymesRepository.save(entityToSave);
    // On met a jour le updatedAt de la BAL
    await this.baseLocaleService.touch(bal.id, toponymeCreated.updatedAt);

    const toponymeEvent = await this.eventService.register(
      { balId: bal.id },
      {
        entityType: EventEntityTypeEnum.TOPONYME,
        entityId: toponymeCreated.id,
        action: EventActionEnum.CREATE,
        after: serializeToponyme(toponymeCreated),
      },
    );
    await emitPositionDiffEvents(
      this.eventService,
      { balId: bal.id, parentEventId: toponymeEvent?.id },
      [],
      toponymeCreated.positions ?? [],
    );

    // On retourne le toponyme créé
    return toponymeCreated;
  }

  async update(
    toponyme: Toponyme,
    updateToponymeDto: UpdateToponymeDTO,
  ): Promise<Toponyme> {
    // On capture l'état avant modification pour le log d'events, avant que
    // `toponyme` ne soit muté en place ci-dessous.
    const positionsBefore: Position[] = toponyme.positions ?? [];
    const toponymeBeforePayload = serializeToponyme(toponyme);

    // On clean le nom et le nomAlt si ils sont présent dans le dto
    if (updateToponymeDto.nom) {
      updateToponymeDto.nom = cleanNom(updateToponymeDto.nom);
    }
    if (updateToponymeDto.nomAlt) {
      updateToponymeDto.nomAlt = cleanNomAlt(updateToponymeDto.nomAlt);
    }
    if (toponyme.nom !== updateToponymeDto.nom) {
      toponyme.codeVoie = null;
    }
    // On update le numéro dans postgres
    Object.assign(toponyme, updateToponymeDto);
    const entityToSave: Toponyme = await this.toponymesRepository.create({
      ...toponyme,
      ...updateToponymeDto,
    });
    await this.toponymesRepository.save(entityToSave);
    // On recharge le toponyme depuis postgres plutôt que d'utiliser la
    // valeur renvoyée par save() : ses positions (FK toponyme_id, rank
    // recalculé par le hook @BeforeUpdate) ne sont fiables qu'après un vrai
    // rechargement, sans quoi le payload d'event avant/après serait construit
    // sur un état partiellement obsolète.
    const toponymeUpdated: Toponyme = await this.toponymesRepository.findOneBy({
      id: toponyme.id,
    });
    await this.baseLocaleService.touch(toponyme.balId);

    // Les positions sont diffées avant de savoir si un event TOPONYME est
    // nécessaire : un event POSITION ne doit jamais rester orphelin, donc si
    // au moins un en survit, un event TOPONYME (même trivial, avant==après)
    // doit exister pour le porter — voir le rattachement plus bas.
    const positionEvents = await emitPositionDiffEvents(
      this.eventService,
      { balId: toponymeUpdated.balId },
      positionsBefore,
      toponymeUpdated.positions ?? [],
    );

    const toponymeAfterPayload = serializeToponyme(toponymeUpdated);
    // Une requète UPDATE renvoie `affected > 0` même si les valeurs envoyées
    // sont identiques aux valeurs actuelles : on ne journalise un event que
    // si l'état du toponyme a réellement changé, ou qu'il faut un conteneur
    // pour les events position ci-dessus.
    const toponymeEvent =
      !payloadsAreEqual(toponymeBeforePayload, toponymeAfterPayload) ||
      positionEvents.length > 0
        ? await this.eventService.register(
            { balId: toponymeUpdated.balId },
            {
              entityType: EventEntityTypeEnum.TOPONYME,
              entityId: toponymeUpdated.id,
              action: EventActionEnum.UPDATE,
              before: toponymeBeforePayload,
              after: toponymeAfterPayload,
            },
          )
        : undefined;

    if (toponymeEvent) {
      await this.eventService.reparentEvents(
        positionEvents.map((event) => event.id),
        toponymeEvent.id,
      );
    }

    // On retourne le toponyme mis a jour
    return toponymeUpdated;
  }

  public async delete(toponyme: Toponyme) {
    // On détache les numéros qui appartenaient a ce toponyme
    // (la FK numeros.toponyme_id -> toponymes.id n'a pas de cascade)
    await this.numeroService.updateMany(
      { toponymeId: toponyme.id },
      {
        toponymeId: null,
      },
    );
    // On supprime le toponyme
    const { affected }: DeleteResult = await this.toponymesRepository.delete({
      id: toponyme.id,
    });
    // Si le toponyme a été supprimer on met a jour le updateAt de la BAL
    if (affected > 0) {
      await this.baseLocaleService.touch(toponyme.balId);

      const toponymeEvent = await this.eventService.register(
        { balId: toponyme.balId },
        {
          entityType: EventEntityTypeEnum.TOPONYME,
          entityId: toponyme.id,
          action: EventActionEnum.DELETE,
          before: serializeToponyme(toponyme),
        },
      );
      for (const position of toponyme.positions ?? []) {
        await this.eventService.register(
          { balId: toponyme.balId, parentEventId: toponymeEvent?.id },
          {
            entityType: EventEntityTypeEnum.POSITION,
            entityId: position.id,
            action: EventActionEnum.DELETE,
            before: serializePosition(position),
          },
        );
      }
    }
  }

  public async deleteMany(where: FindOptionsWhere<Toponyme>) {
    // On supprime les toponyme
    await this.toponymesRepository.delete(where);
  }

  async importMany(baseLocale: BaseLocale, rawToponymes: Partial<Toponyme>[]) {
    // On transforme les raw en toponymes
    const toponymes: Partial<Toponyme>[] = rawToponymes
      // On garde seulement les toponymes qui ont un nom
      .filter(({ nom }) => Boolean(nom))
      // On map les raw pour obtenir de vrai topnymes
      .map((rawToponyme) => ({
        id: rawToponyme.id,
        balId: baseLocale.id,
        banId: rawToponyme.banId || uuid(),
        nom: cleanNom(rawToponyme.nom),
        parcelles: rawToponyme.parcelles || [],
        nomAlt: getNomAltDefault(rawToponyme.nomAlt),
        communeDeleguee: rawToponyme.communeDeleguee,
        ...(rawToponyme.codeVoie && { codeVoie: rawToponyme.codeVoie }),
        ...(rawToponyme.updatedAt && { updatedAt: rawToponyme.updatedAt }),
        ...(rawToponyme.createdAt && { createdAt: rawToponyme.createdAt }),
      }));
    // On ne retourne rien si il n'y a pas de topnyme a insert
    if (toponymes.length === 0) {
      return;
    }
    // On insert les toponymes
    await this.toponymesRepository
      .createQueryBuilder()
      .insert()
      .into(Toponyme)
      .values(toponymes)
      .execute();
    // On créer les positions
    const positions: Partial<Position>[] = [];
    for (const rawToponyme of rawToponymes) {
      let rank = 0;
      for (const { source, type, point } of rawToponyme.positions) {
        positions.push({
          id: new ObjectId().toHexString(),
          toponymeId: rawToponyme.id,
          source,
          type,
          point,
          rank,
        });
        rank++;
      }
    }
    if (positions.length === 0) {
      return;
    }
    // On insert les positions
    await this.toponymesRepository
      .createQueryBuilder()
      .insert()
      .into(Position)
      .values(positions)
      .execute();
  }

  async findManyWherePositionInBBox(
    balId: string,
    bbox: number[],
  ): Promise<ToponymeInBox[]> {
    const query = this.toponymesRepository
      .createQueryBuilder('toponymes')
      .distinctOn(['toponymes.id'])
      .select('toponymes.id', 'id')
      .addSelect('toponymes.nom', 'nom')
      .addSelect('positions.point', 'point')
      .leftJoin('toponymes.positions', 'positions')
      .where('toponymes.bal_id = :balId', { balId })
      .andWhere(
        'positions.point @ ST_MakeEnvelope(:xmin, :ymin, :xmax, :ymax, 4326)',
        {
          xmin: bbox[0],
          ymin: bbox[1],
          xmax: bbox[2],
          ymax: bbox[3],
        },
      );

    return query.getRawMany();
  }

  public async isToponymeExist(
    id: string,
    balId: string = null,
  ): Promise<boolean> {
    // On créer le where avec id et balId et lance la requète
    const where: FindOptionsWhere<Toponyme> = {
      id,
      ...(balId && { balId }),
    };
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
