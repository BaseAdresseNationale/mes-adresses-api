import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteResult,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  In,
  Repository,
  SelectQueryBuilder,
  UpdateResult,
} from 'typeorm';
import { keyBy } from 'lodash';
import * as turf from '@turf/turf';
import { v4 as uuid } from 'uuid';
import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';
import { Voie, TypeNumerotationEnum } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { cleanNom, cleanNomAlt, getNomAltDefault } from '@/lib/utils/nom.util';
import {
  ExtendedVoieDTO,
  VoieMetas,
} from '@/modules/voie/dto/extended_voie.dto';
import { UpdateVoieDTO } from '@/modules/voie/dto/update_voie.dto';
import { CreateVoieDTO } from '@/modules/voie/dto/create_voie.dto';
import { NumeroService } from '@/modules/numeros/numero.service';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { S3Service } from '@/shared/modules/s3/s3.service';
import {
  prepareDocumentHeader,
  processImageFile,
} from '@/lib/document/document-builder';
import { buildArreteDeNumerotationVoieDefinition } from '@/lib/document/templates/voie/arrete-de-numerotation';
import { generateDocument } from '@/lib/document/document-generator';
import { DocumentFormat } from '@/lib/document/types';
import { EventService } from '@/modules/event/event.service';
import {
  EventActionEnum,
  EventEntityTypeEnum,
} from '@/shared/entities/event.entity';
import { serializeVoie } from '@/modules/event/serializers/voie.serializer';
import { serializeNumero } from '@/modules/event/serializers/numero.serializer';
import { serializePosition } from '@/modules/event/serializers/position.serializer';
import { serializeToponyme } from '@/modules/event/serializers/toponyme.serializer';

@Injectable()
export class VoieService {
  constructor(
    @InjectRepository(Voie)
    private voiesRepository: Repository<Voie>,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
    @Inject(forwardRef(() => ToponymeService))
    private toponymeService: ToponymeService,
    @Inject(forwardRef(() => S3Service))
    private s3service: S3Service,
    private eventService: EventService,
  ) {}

  async findOneOrFail(voieId: string): Promise<Voie> {
    // Créer le filtre where et lance la requète postgres
    const where: FindOptionsWhere<Voie> = {
      id: voieId,
    };
    const voie = await this.voiesRepository.findOne({ where });
    // Si la voie n'existe pas, on throw une erreur
    if (!voie) {
      throw new HttpException(`Voie ${voieId} not found`, HttpStatus.NOT_FOUND);
    }
    return voie;
  }

  async findMany(
    where: FindOptionsWhere<Voie>,
    select?: FindOptionsSelect<Voie>,
    relations?: FindOptionsRelations<Voie>,
  ): Promise<Voie[]> {
    return this.voiesRepository.find({
      where,
      ...(select && { select }),
      ...(relations && { relations }),
    });
  }

  async findManyWhereCentroidInBBox(
    balId: string,
    bbox: number[],
  ): Promise<Voie[]> {
    // Requète postgis qui permet de récupèré les voie dont le centroid est dans la bbox
    return this.voiesRepository
      .createQueryBuilder('voies')
      .where('bal_id = :balId', { balId })
      .andWhere(
        'centroid @ ST_MakeEnvelope(:xmin, :ymin, :xmax, :ymax, 4326)',
        {
          xmin: bbox[0],
          ymin: bbox[1],
          xmax: bbox[2],
          ymax: bbox[3],
        },
      )
      .getMany();
  }

  async findManyWhereTraceInBBox(
    balId: string,
    bbox: number[],
  ): Promise<Voie[]> {
    // Requète postgis qui permet de récupèré les voie dont le centroid est dans la bbox
    return this.voiesRepository
      .createQueryBuilder()
      .where('bal_id = :balId', { balId })
      .andWhere(
        'ST_Intersects(trace, ST_MakeEnvelope(:xmin, :ymin, :xmax, :ymax, 4326) )',
        {
          xmin: bbox[0],
          ymin: bbox[1],
          xmax: bbox[2],
          ymax: bbox[3],
        },
      )
      .getMany();
  }

  public async create(
    bal: BaseLocale,
    createVoieDto: CreateVoieDTO,
  ): Promise<Voie> {
    // Créer l'object Voie a partir du dto
    const voie: Partial<Voie> = {
      balId: bal.id,
      banId: uuid(),
      nom: createVoieDto.nom,
      typeNumerotation:
        createVoieDto.typeNumerotation || TypeNumerotationEnum.NUMERIQUE,
      trace: createVoieDto.trace || null,
      nomAlt: createVoieDto.nomAlt ? cleanNomAlt(createVoieDto.nomAlt) : null,
      centroid: null,
      bbox: null,
      comment: createVoieDto.comment,
    };
    // Calculer le centroid si la trace et le type de numerotation est metrique
    if (voie.trace && voie.typeNumerotation === TypeNumerotationEnum.METRIQUE) {
      voie.centroid = turf.centroid(voie.trace)?.geometry;
    }
    // Créer l'entité typeorm
    const entityToSave: Voie = this.voiesRepository.create(voie);
    // On insert l'object dans postgres
    const voieCreated: Voie = await this.voiesRepository.save(entityToSave);
    // Mettre a jour le updatedAt de la BAL
    await this.baseLocaleService.touch(bal.id, voieCreated.updatedAt);
    await this.eventService.register(
      { balId: bal.id, voieId: voieCreated.id },
      {
        entityType: EventEntityTypeEnum.VOIE,
        entityId: voieCreated.id,
        action: EventActionEnum.CREATE,
        after: serializeVoie(voieCreated),
      },
    );
    // On retourne la voie créé
    return voieCreated;
  }

  public async importMany(baseLocale: BaseLocale, rawVoies: Partial<Voie>[]) {
    // On transforme les raw en voies
    const voies: Partial<Voie>[] = rawVoies
      // On garde seulement les voies qui ont un nom
      .filter(({ nom }) => Boolean(nom))
      .map((rawVoie: Partial<Voie>) => ({
        id: rawVoie.id,
        balId: baseLocale.id,
        banId: rawVoie.banId || uuid(),
        nom: cleanNom(rawVoie.nom),
        nomAlt: getNomAltDefault(rawVoie.nomAlt),
        typeNumerotation: rawVoie.typeNumerotation,
        trace: rawVoie.trace || null,
        ...(rawVoie.codeVoie && { codeVoie: rawVoie.codeVoie }),
        ...(rawVoie.updatedAt && { updatedAt: rawVoie.updatedAt }),
        ...(rawVoie.createdAt && { createdAt: rawVoie.createdAt }),
      }));
    // On ne retourne rien si il n'y a pas de voies a insert
    if (voies.length === 0) {
      return;
    }
    // On insert les voies
    await this.voiesRepository
      .createQueryBuilder()
      .insert()
      .into(Voie)
      .values(voies)
      .execute();
  }

  public async update(voie: Voie, updateVoieDto: UpdateVoieDTO): Promise<Voie> {
    // Si le nom a été modifier, on le clean
    if (updateVoieDto.nom) {
      updateVoieDto.nom = cleanNom(updateVoieDto.nom);
    }
    // Si les noms alternatif on été modifier
    if (updateVoieDto.nomAlt) {
      updateVoieDto.nomAlt = cleanNomAlt(updateVoieDto.nomAlt);
    }
    // Créer le where et lancer la requète
    const where: FindOptionsWhere<Voie> = {
      id: voie.id,
    };
    const res: UpdateResult = await this.voiesRepository.update(where, {
      ...updateVoieDto,
      ...(updateVoieDto.nom !== voie.nom ? { codeVoie: null } : null),
    });
    // On récupère la voie modifiée
    const voieUpdated: Voie = await this.voiesRepository.findOneBy(where);
    // Si la voie a été modifiée
    if (res.affected > 0) {
      // On met a jour le centroid de la voie si la trace a été mis a jour
      let finalVoie = voieUpdated;
      if (
        updateVoieDto.trace &&
        voieUpdated.typeNumerotation === TypeNumerotationEnum.METRIQUE
      ) {
        await this.calcCentroidAndBboxWithTrace(voieUpdated);
        finalVoie = await this.voiesRepository.findOneBy(where);
      }
      // On met a jour le updatedAt de la BAL
      await this.baseLocaleService.touch(
        voieUpdated.balId,
        voieUpdated.updatedAt,
      );
      await this.eventService.register(
        { balId: voieUpdated.balId, voieId: voie.id },
        {
          entityType: EventEntityTypeEnum.VOIE,
          entityId: voie.id,
          action: EventActionEnum.UPDATE,
          before: serializeVoie(voie),
          after: serializeVoie(finalVoie),
        },
      );
    }
    // On retourne la voie modifiée
    return voieUpdated;
  }

  public async delete(voie: Voie) {
    // On charge les numéros (et leurs positions, chargées eager) avant la
    // suppression, puisqu'ils seront supprimés en cascade par postgres et
    // qu'il n'y aura ensuite plus rien à lire pour journaliser leur event.
    const numeros: Numero[] = await this.numeroService.findMany({
      voieId: voie.id,
    });

    // On lance la requète postgres pour supprimer définitivement la voie
    // Les numéros sont supprimé en cascade par postgres
    const { affected }: DeleteResult = await this.voiesRepository.delete({
      id: voie.id,
    });

    if (affected >= 1) {
      // Si une voie a bien été supprimé on met a jour le updatedAt de la Bal
      await this.baseLocaleService.touch(voie.balId);

      const voieEvent = await this.eventService.register(
        { balId: voie.balId, voieId: voie.id },
        {
          entityType: EventEntityTypeEnum.VOIE,
          entityId: voie.id,
          action: EventActionEnum.DELETE,
          before: serializeVoie(voie),
        },
      );
      for (const numero of numeros) {
        const numeroEvent = await this.eventService.register(
          { balId: voie.balId, parentEventId: voieEvent?.id, voieId: voie.id },
          {
            entityType: EventEntityTypeEnum.NUMERO,
            entityId: numero.id,
            action: EventActionEnum.DELETE,
            before: serializeNumero(numero),
          },
        );
        for (const position of numero.positions ?? []) {
          await this.eventService.register(
            {
              balId: voie.balId,
              parentEventId: numeroEvent?.id,
              voieId: voie.id,
            },
            {
              entityType: EventEntityTypeEnum.POSITION,
              entityId: position.id,
              action: EventActionEnum.DELETE,
              before: serializePosition(position),
            },
          );
        }
      }

      if (voieEvent) {
        // Numeros of this voie already deleted independently before this
        // voie deletion (so absent from `numeros`, loaded above) left an
        // orphan root DELETE event: reparent it here so this voie's whole
        // unpublished history forms a single tree.
        await this.eventService.reparentOrphanedDeletedNumeros({
          balId: voie.balId,
          voieId: voie.id,
          newRootId: voieEvent.id,
        });
      }
    }
  }

  public deleteMany(where: FindOptionsWhere<Voie>): Promise<any> {
    return this.voiesRepository.delete(where);
  }

  public async isVoieExist(id: string, balId: string = null): Promise<boolean> {
    // On créer le where avec id et balId et lance la requète
    const where: FindOptionsWhere<Voie> = {
      id,
      ...(balId && { balId }),
    };
    return this.voiesRepository.exists({ where });
  }

  public async convertToToponyme(voie: Voie): Promise<Toponyme> {
    // On lance une erreur si la voie n'existe pas
    if (!(await this.isVoieExist(voie.id))) {
      throw new HttpException(
        `Voie ${voie.id} is deleted`,
        HttpStatus.BAD_REQUEST,
      );
    }
    // On lance une erreur si la voie a des numeros
    const numerosCount: number = await this.numeroService.count({
      voieId: voie.id,
    });
    if (numerosCount > 0) {
      throw new HttpException(
        `Voie ${voie.id} has numero(s)`,
        HttpStatus.BAD_REQUEST,
      );
    }
    // On recupère la Bal
    const baseLocale = await this.baseLocaleService.findOneOrFail(voie.balId);
    // On créer un toponyme avec les noms de la voie
    const payload: Partial<Toponyme> = {
      nom: voie.nom,
      nomAlt: voie.nomAlt,
      banId: voie.banId,
    };
    const toponyme: Toponyme = await this.toponymeService.create(
      baseLocale,
      payload,
    );
    // On supprimer la voie de postgres
    await this.delete(voie);

    // `create` et `delete` ci-dessus ont chacun émis leur propre event
    // individuel (CREATE sur le toponyme, DELETE sur la voie) : l'event
    // composite qui suit absorbe ces events non publiés (cf.
    // EventService.registerComposite) pour ne laisser qu'un seul event
    // agrégé, conformément à la granularité attendue pour cette opération.
    await this.eventService.registerComposite(
      { balId: voie.balId },
      {
        action: EventActionEnum.CONVERT_VOIE_TO_TOPONYME,
        before: { voie: serializeVoie(voie) },
        after: { toponyme: serializeToponyme(toponyme) },
        entities: [
          { entityType: EventEntityTypeEnum.VOIE, entityId: voie.id },
          { entityType: EventEntityTypeEnum.TOPONYME, entityId: toponyme.id },
        ],
      },
    );

    // On retourne le toponyme créé
    return toponyme;
  }

  public async fusionVoie(voie: Voie, otherVoieIds: string[]): Promise<Voie> {
    // On lance une erreur si la voie n'existe pas
    if (!(await this.isVoieExist(voie.id))) {
      throw new HttpException(
        `Voie ${voie.id} is deleted`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const sourceVoies: Voie[] = await this.findMany({
      id: In(otherVoieIds),
    });
    const movedNumeros: Numero[] = await this.numeroService.findMany({
      voieId: In(otherVoieIds),
    });

    await this.numeroService.updateMany(
      { voieId: In(otherVoieIds) },
      { voieId: voie.id },
    );
    await this.deleteMany({ id: In(otherVoieIds) });

    const voieAfter: Voie = await this.findOneOrFail(voie.id);

    await this.eventService.registerComposite(
      { balId: voie.balId },
      {
        action: EventActionEnum.MERGE_VOIES,
        before: {
          targetVoie: serializeVoie(voie),
          sourceVoies: sourceVoies.map(serializeVoie),
        },
        after: {
          targetVoie: serializeVoie(voieAfter),
          movedNumeroIds: movedNumeros.map(({ id }) => id),
        },
        entities: [
          { entityType: EventEntityTypeEnum.VOIE, entityId: voie.id },
          ...sourceVoies.map((v) => ({
            entityType: EventEntityTypeEnum.VOIE,
            entityId: v.id,
          })),
          ...movedNumeros.map((n) => ({
            entityType: EventEntityTypeEnum.NUMERO,
            entityId: n.id,
          })),
        ],
      },
    );

    return voieAfter;
  }

  public async extendVoies(
    balId: string,
    voies: Voie[],
  ): Promise<ExtendedVoieDTO[]> {
    const voiesMetas = await this.findVoiesMetas(balId);
    const voiesMetasIndex = keyBy(voiesMetas, 'id');
    return voies.map((voie) => ({ ...voie, ...voiesMetasIndex[voie.id] }));
  }

  public async touch(voieId: string, updatedAt: Date = new Date()) {
    return this.voiesRepository.update({ id: voieId }, { updatedAt });
  }

  public async calcCentroidAndBbox(voieId: string): Promise<void> {
    // On récupère la voie
    const voie: Voie = await this.findOneOrFail(voieId);
    if (voie.typeNumerotation === TypeNumerotationEnum.NUMERIQUE) {
      // On calcule la voie avec les numero si la voie est numerique
      await this.calcCentroidAndBboxWithNumeros(voieId);
    } else if (
      voie.trace &&
      voie.typeNumerotation === TypeNumerotationEnum.METRIQUE
    ) {
      // On calcul la voie avec la trace si la voie est metrique
      await this.calcCentroidAndBboxWithTrace(voie);
    }
  }

  private async calcCentroidAndBboxWithNumeros(voieId: string): Promise<void> {
    const res = await this.numeroService.findCentroidAndBboxVoie(voieId);
    if (res) {
      const { centroid, polygon } = res;
      const bbox: number[] = turf.bbox(polygon);
      await this.voiesRepository.update({ id: voieId }, { centroid, bbox });
    } else {
      await this.voiesRepository.update(
        { id: voieId },
        { centroid: null, bbox: null },
      );
    }
  }

  private async calcCentroidAndBboxWithTrace(voie: Voie): Promise<void> {
    const centroid = turf.centroid(voie.trace)?.geometry;
    const bbox = turf.bbox(voie.trace);
    await this.voiesRepository.update({ id: voie.id }, { centroid, bbox });
  }

  createQueryVoieMetas: SelectQueryBuilder<Voie> = this.voiesRepository
    .createQueryBuilder('voies')
    .select('voies.id', 'id')
    .addSelect('count(numeros.id)::int', 'nbNumeros')
    .addSelect(
      'count(CASE WHEN numeros.certifie THEN true END)::int',
      'nbNumerosCertifies',
    )
    .addSelect(
      'CASE WHEN count(numeros.id) > 0 AND count(CASE WHEN numeros.certifie THEN true END) = count(numeros.id) THEN true ELSE false END',
      'isAllCertified',
    )
    .addSelect('voies.comment', 'comment')
    .addSelect(
      `array_remove(array_agg(CASE WHEN numeros.comment IS NOT NULL THEN concat(numeros.numero, numeros.suffixe, ' - ', numeros.comment) END), NULL)`,
      'commentedNumeros',
    )
    .leftJoin('voies.numeros', 'numeros')
    .groupBy('voies.id, voies.comment');

  async findVoieMetas(voieId: string): Promise<VoieMetas> {
    const query = this.createQueryVoieMetas.where('voies.id = :voieId', {
      voieId,
    });
    return query.getRawOne();
  }

  async findVoiesMetas(balId: string): Promise<VoieMetas[]> {
    const query = this.createQueryVoieMetas.where('voies.bal_id = :balId', {
      balId,
    });
    return query.getRawMany();
  }

  async findVoiesTraces(
    balId: string,
  ): Promise<
    { nom: string; trace: string; updatedat: Date; createdat: Date }[]
  > {
    return this.voiesRepository
      .createQueryBuilder('voies')
      .select([
        'voies.nom as nom',
        'ST_AsGeoJSON(voies.trace) as trace',
        'voies.updatedAt as updatedat',
        'voies.createdAt as createdat',
      ])
      .where('voies.type_numerotation = :typeNumerotation', {
        typeNumerotation: TypeNumerotationEnum.METRIQUE,
      })
      .andWhere('voies.trace IS NOT NULL')
      .andWhere('voies.bal_id = :balId', {
        balId,
      })
      .getRawMany();
  }

  async getGenerateDocumentForVoieParams(voie: Voie) {
    const baseLocale = await this.baseLocaleService.findOneOrFail(voie.balId);
    if (baseLocale.status !== StatusBaseLocalEnum.PUBLISHED) {
      throw new HttpException(
        'La Base Adresse Locale doit être publiée pour pouvoir générer le document',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return { baseLocale };
  }

  async generateArreteDeNumerotation(params: {
    voie: Voie;
    format?: DocumentFormat;
    planDeSituation?: Express.Multer.File;
  }): Promise<string> {
    const { voie, format = DocumentFormat.PDF } = params;
    const { baseLocale } = await this.getGenerateDocumentForVoieParams(voie);
    const voieWithNumeros = await this.voiesRepository.findOne({
      where: { id: voie.id },
      relations: { numeros: true },
    });

    const header = await prepareDocumentHeader({
      nom: baseLocale.communeNom,
      code: baseLocale.commune,
    });

    const planDeSituationImage = params.planDeSituation
      ? await processImageFile(params.planDeSituation)
      : undefined;

    const definition = buildArreteDeNumerotationVoieDefinition(header, {
      baseLocale,
      voie: voieWithNumeros,
      planDeSituation: planDeSituationImage,
    });

    const { data, contentType, extension } = await generateDocument(
      definition,
      format,
    );

    const fileName = `arrete_de_numerotation_${voie.id}.${extension}`;

    await this.s3service.uploadPublicFile(
      fileName,
      process.env.S3_CONTAINER_GENERATED_FILES,
      data,
      {
        ContentType: contentType,
        ...(format === DocumentFormat.PDF ? { ContentEncoding: 'ascii' } : {}),
      },
    );

    const fileUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_CONTAINER_GENERATED_FILES}/${fileName}`;

    return fileUrl;
  }
}
