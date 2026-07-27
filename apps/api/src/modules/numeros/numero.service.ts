import {
  Injectable,
  HttpStatus,
  HttpException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteResult,
  FindOptionsOrder,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  In,
  Point,
  Repository,
  UpdateResult,
  Polygon,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { pick, chunk } from 'lodash';
import { ObjectId } from 'mongodb';

import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';
import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';
import { normalizeSuffixe } from '@/shared/utils/numero.utils';
import { Position } from '@/shared/entities/position.entity';

import { UpdateNumeroDTO } from '@/modules/numeros/dto/update_numero.dto';
import { CreateNumeroDTO } from '@/modules/numeros/dto/create_numero.dto';
import { UpdateBatchNumeroDTO } from '@/modules/numeros/dto/update_batch_numero.dto';
import { DeleteBatchNumeroDTO } from '@/modules/numeros/dto/delete_batch_numero.dto';
import { VoieService } from '@/modules/voie/voie.service';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { BatchNumeroResponseDTO } from './dto/batch_numero_response.dto';
import { NumeroInBbox } from '@/lib/types/numero.type';
import {
  prepareDocumentHeader,
  processImageFile,
} from '@/lib/document/document-builder';
import { buildCertificatAdressageDefinition } from '@/lib/document/templates/numero/certificat-adressage';
import { buildArreteDeNumerotationNumeroDefinition } from '@/lib/document/templates/numero/arrete-de-numerotation';
import { generateDocument } from '@/lib/document/document-generator';
import { DocumentFormat } from '@/lib/document/types';
import { GenerateCertificatDTO } from './dto/generate_certificat.dto';
import { S3Service } from '@/shared/modules/s3/s3.service';
import { EventService } from '@/modules/event/event.service';
import {
  EventActionEnum,
  EventEntityTypeEnum,
} from '@/shared/entities/event.entity';
import { serializeNumero } from '@/modules/event/serializers/numero.serializer';
import { serializePosition } from '@/modules/event/serializers/position.serializer';
import { emitPositionDiffEvents } from '@/modules/event/position-diff.util';
import { payloadsAreEqual } from '@/modules/event/payload-diff.util';

@Injectable()
export class NumeroService {
  constructor(
    @InjectRepository(Numero)
    private numerosRepository: Repository<Numero>,
    @InjectRepository(Position)
    private positionsRepository: Repository<Position>,
    @Inject(forwardRef(() => VoieService))
    private voieService: VoieService,
    @Inject(forwardRef(() => ToponymeService))
    private toponymeService: ToponymeService,
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
    @Inject(forwardRef(() => S3Service))
    private s3service: S3Service,
    private eventService: EventService,
  ) {}

  async findOneOrFail(numeroId: string): Promise<Numero> {
    // Créer le filtre where et lance la requète postgres
    const where: FindOptionsWhere<Numero> = {
      id: numeroId,
    };
    const numero = await this.numerosRepository.findOne({ where });
    // Si len numero n'existe pas, on throw une erreur
    if (!numero) {
      throw new HttpException(
        `Numero ${numeroId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return numero;
  }

  async findManyByBal(balId: string, select?: string[]): Promise<Numero[]> {
    const where: FindOptionsWhere<Numero> = { balId };

    // Si aucun champ n'est demandé, on renvoie tous les numeros de la BAL.
    if (!select || select.length === 0) {
      return this.numerosRepository.find({ where });
    }

    // La validation des champs autorisés est faite en amont par
    // `NumeroSelectFieldValidator` (via `FindNumerosQueryDTO`).
    // `numeroComplet` est un champ virtuel calculé côté entité (@AfterLoad)
    // à partir de `numero` et `suffixe`; on développe ici pour projeter les
    // colonnes réelles correspondantes.
    const selectOptions: FindOptionsSelect<Numero> = {};
    for (const field of select) {
      if (field === 'numeroComplet') {
        selectOptions.numero = true;
        selectOptions.suffixe = true;
      } else {
        (selectOptions as Record<string, boolean>)[field] = true;
      }
    }

    return this.numerosRepository.find({ where, select: selectOptions });
  }

  async findMany(
    where: FindOptionsWhere<Numero>,
    select?: FindOptionsSelect<Numero>,
    order?: FindOptionsOrder<Numero>,
    relations?: FindOptionsRelations<Numero>,
  ): Promise<Numero[]> {
    // Get les numeros en fonction du where, select, order et des relations
    return this.numerosRepository.find({
      where,
      ...(select && { select }),
      ...(order && { order }),
      ...(relations && { relations }),
    });
  }

  async countBalNumeroAndCertifie(balId: string): Promise<{
    nbNumeros: string;
    nbNumerosCertifies: string;
    extent: any;
  }> {
    const query = this.numerosRepository
      .createQueryBuilder('numeros')
      .select('count(numeros.id)', 'nbNumeros')
      .addSelect(
        'count(CASE WHEN numeros.certifie THEN true END)',
        'nbNumerosCertifies',
      )
      .where('numeros.bal_id = :balId', { balId });
    return query.getRawOne();
  }

  async findDistinct(
    where: FindOptionsWhere<Numero>,
    field: string,
  ): Promise<string[]> {
    // Get la liste distinct du field dans l'enssemble where
    const res = await this.numerosRepository
      .createQueryBuilder()
      .select(field)
      .distinctOn([field])
      .where(where)
      .getRawMany();
    return res.map((raw) => raw[field]);
  }

  // Liste triée des ids des numeros actuellement rattachés à ce toponyme —
  // utilisée par ToponymeService pour construire le `numeroIds` d'un event
  // TOPONYME (le tri garantit un tableau déterministe, condition nécessaire
  // pour que la comparaison structurelle des payloads d'events reste fiable).
  async findIdsByToponyme(toponymeId: string): Promise<string[]> {
    const numeros = await this.numerosRepository.find({
      where: { toponymeId },
      select: { id: true },
    });
    return numeros.map(({ id }) => id).sort();
  }

  async findDistinctParcelles(balId: string): Promise<string[]> {
    const res: any[] = await this.numerosRepository.query(
      `SELECT ARRAY_AGG(distinct elem)
        FROM (select unnest(parcelles) as elem, bal_id from numeros) s
        WHERE bal_id = '${balId}'`,
    );
    return res[0]?.array_agg || [];
  }

  async findManyWherePositionInBBox(
    balId: string,
    bbox: number[],
  ): Promise<NumeroInBbox[]> {
    // Requète postgis qui permet de récupèré les numeros dont le centroid est dans la bbox
    const query = this.numerosRepository
      .createQueryBuilder('numeros')
      .distinctOn(['numeros.id'])
      .select('numeros.id', 'id')
      .addSelect('numeros.numero', 'numero')
      .addSelect('numeros.suffixe', 'suffixe')
      .addSelect('numeros.parcelles', 'parcelles')
      .addSelect('numeros.certifie', 'certifie')
      .addSelect('numeros.voie_id', 'voieId')
      .addSelect('numeros.toponyme_id', 'toponymeId')
      .addSelect('positions.point', 'point')
      .leftJoin('numeros.positions', 'positions')
      .where('numeros.bal_id = :balId', { balId })
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

  async findManyWherePositionInPolygon(
    balId: string,
    polygon: number[][],
  ): Promise<Numero[]> {
    const linestring: string = polygon
      .map((arr) => `${arr[0]} ${arr[1]}`)
      .join(',');
    // Requète postgis qui permet de récupèré les numeros dans un polygon simple
    const query = this.numerosRepository
      .createQueryBuilder('numeros')
      .leftJoinAndSelect('numeros.positions', 'positions')
      .where('numeros.balId = :balId', { balId })
      .andWhere(
        `ST_Contains(ST_Polygon('LINESTRING(${linestring})'::geometry, 4326), positions.point)`,
      );
    return query.getMany();
  }

  public async count(where: FindOptionsWhere<Numero>): Promise<number> {
    return this.numerosRepository.count({ where });
  }

  public async updateMany(
    where: FindOptionsWhere<Numero>,
    update: Partial<Numero>,
  ): Promise<any> {
    return this.numerosRepository.update(where, update);
  }

  async importMany(
    baseLocale: BaseLocale,
    rawNumeros: Partial<Numero>[],
  ): Promise<void> {
    const validRawNumeros: Partial<Numero>[] = rawNumeros.filter(
      ({ voieId, numero }) => Boolean(voieId && Number.isInteger(numero)),
    );
    // On transforme les raw en numeros
    const numeros = validRawNumeros
      // On garde seulement les numeros qui ont une voie et un numero
      .map((rawNumero) => ({
        id: rawNumero.id,
        balId: baseLocale.id,
        banId: rawNumero.banId || uuid(),
        numero: rawNumero.numero,
        comment: rawNumero.comment,
        toponymeId: rawNumero.toponymeId,
        voieId: rawNumero.voieId,
        ...(rawNumero.suffixe && {
          suffixe: normalizeSuffixe(rawNumero.suffixe),
        }),
        parcelles: rawNumero.parcelles || [],
        certifie: rawNumero.certifie || false,
        communeDeleguee: rawNumero.communeDeleguee,
        ...(rawNumero.updatedAt && { updatedAt: rawNumero.updatedAt }),
        ...(rawNumero.createdAt && { createdAt: rawNumero.createdAt }),
      }));
    // On ne retourne rien si il n'y a pas de numeros a insert
    if (numeros.length === 0) {
      return;
    }
    // On insert les numeros 500 par 500
    for (const numerosChunk of chunk(numeros, 500)) {
      await this.numerosRepository
        .createQueryBuilder()
        .insert()
        .into(Numero)
        .values(numerosChunk)
        .execute();
    }
    // On créer les positions
    const positions: Partial<Position>[] = [];
    for (const rawNumero of validRawNumeros) {
      let rank = 0;
      for (const { source, type, point } of rawNumero.positions) {
        positions.push({
          id: new ObjectId().toHexString(),
          numeroId: rawNumero.id,
          source,
          type,
          point,
          rank,
        });
        rank++;
      }
    }
    // On insert les positions 500 par 500
    for (const positionsChunk of chunk(positions, 500)) {
      await this.numerosRepository
        .createQueryBuilder()
        .insert()
        .into(Position)
        .values(positionsChunk)
        .execute();
    }
  }

  public async create(
    voie: Voie,
    createNumeroDto: CreateNumeroDTO,
  ): Promise<Numero> {
    // Si il y a un toponyme, on vérifie qu'il existe
    if (
      createNumeroDto.toponymeId &&
      !(await this.toponymeService.isToponymeExist(createNumeroDto.toponymeId))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
    }
    // On créer l'object numéro
    const numero: Partial<Numero> = {
      balId: voie.balId,
      banId: uuid(),
      voieId: voie.id,
      numero: createNumeroDto.numero,
      suffixe: createNumeroDto.suffixe
        ? normalizeSuffixe(createNumeroDto.suffixe)
        : null,
      toponymeId: createNumeroDto.toponymeId || null,
      positions: createNumeroDto.positions || [],
      comment: createNumeroDto.comment || null,
      parcelles: createNumeroDto.parcelles || [],
      certifie: createNumeroDto.certifie || false,
      communeDeleguee: createNumeroDto.communeDeleguee || null,
    };
    // Créer l'entité typeorm
    const entityToSave: Numero = this.numerosRepository.create(numero);
    // On insert l'object dans postgres
    const numeroCreated: Numero =
      await this.numerosRepository.save(entityToSave);
    // On calcule le centroid de la voie
    await this.voieService.calcCentroidAndBbox(voie.id);
    // On met a jour le updatedAt de la Bal
    await this.baseLocaleService.touch(numero.balId);

    // If the voie itself was just created and isn't published yet, nest this
    // numero's CREATE under the voie's CREATE event — so rolling back the
    // voie's creation cannot leave a numero dangling with a voieId pointing
    // to a voie that never existed publicly. This nesting survives any
    // later update()/delete() on this numero (see EventService.fuse()).
    const parentEventId = await this.eventService.findUnsyncedVoieCreateEventId(
      voie.id,
    );
    const numeroEvent = await this.eventService.register(
      { balId: voie.balId, parentEventId, voieId: voie.id },
      {
        entityType: EventEntityTypeEnum.NUMERO,
        entityId: numeroCreated.id,
        action: EventActionEnum.CREATE,
        after: serializeNumero(numeroCreated),
      },
    );
    await emitPositionDiffEvents(
      this.eventService,
      { balId: voie.balId, parentEventId: numeroEvent?.id, voieId: voie.id },
      [],
      numeroCreated.positions ?? [],
    );

    // La jonction numero<->toponyme n'est visible que côté event TOPONYME.
    if (numeroCreated.toponymeId) {
      await this.toponymeService.registerNumeroLinkChange(
        voie.balId,
        numeroCreated.toponymeId,
        [numeroCreated.id],
        [],
      );
    }

    return numeroCreated;
  }

  public async update(
    numero: Numero,
    updateNumeroDto: UpdateNumeroDTO,
  ): Promise<Numero> {
    // Si il y a un changement de voie, on vérifie que cette derniere existe
    if (
      updateNumeroDto.voieId &&
      !(await this.voieService.isVoieExist(updateNumeroDto.voieId))
    ) {
      throw new HttpException('Voie not found', HttpStatus.NOT_FOUND);
    }
    // Si il y a un changement de toponyme, on vérifie que ce dernier existe
    if (
      updateNumeroDto.toponymeId &&
      !(await this.toponymeService.isToponymeExist(updateNumeroDto.toponymeId))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
    }
    // On normalize le suffix
    if (updateNumeroDto.suffixe) {
      updateNumeroDto.suffixe = normalizeSuffixe(updateNumeroDto.suffixe);
    }
    // On update le numéro dans postgres
    const numeroToSave: Numero = this.numerosRepository.create({
      id: numero.id,
      ...updateNumeroDto,
      updatedAt: new Date(),
    });

    await this.numerosRepository.save(numeroToSave);
    const numeroUpdated: Numero = await this.numerosRepository.findOneBy({
      id: numero.id,
    });
    // Si le numero a été modifié
    if (updateNumeroDto.voieId) {
      // On recalcule le centroid de l'ancienne et la nouvelle voie si le numero a changé de voie
      await this.voieService.calcCentroidAndBbox(numero.voieId);
      await this.voieService.calcCentroidAndBbox(numeroUpdated.voieId);
    } else if (updateNumeroDto.positions) {
      // On recalcule le centroid de la voie si les positions du numeros on changé
      await this.voieService.calcCentroidAndBbox(numero.voieId);
    }
    // On met a jour le updatedAt de la voie
    await this.voieService.touch(numero.voieId);
    // On met a jour le updatedAt de la BAL
    await this.baseLocaleService.touch(numero.balId);

    // Les positions sont diffées avant de savoir si un event NUMERO est
    // nécessaire : un event POSITION ne doit jamais rester orphelin, donc si
    // au moins un en survit, un event NUMERO (même trivial, avant==après)
    // doit exister pour le porter — voir le rattachement plus bas.
    const positionEvents = await emitPositionDiffEvents(
      this.eventService,
      { balId: numero.balId, voieId: numeroUpdated.voieId },
      numero.positions ?? [],
      numeroUpdated.positions ?? [],
    );

    const numeroBeforePayload = serializeNumero(numero);
    const numeroAfterPayload = serializeNumero(numeroUpdated);
    // Une requète UPDATE renvoie `affected > 0` même si les valeurs envoyées
    // sont identiques aux valeurs actuelles : on ne journalise un event que
    // si l'état du numero a réellement changé, ou qu'il faut un conteneur
    // pour les events position ci-dessus.
    const numeroEvent =
      !payloadsAreEqual(numeroBeforePayload, numeroAfterPayload) ||
      positionEvents.length > 0
        ? await this.eventService.register(
            { balId: numero.balId, voieId: numeroUpdated.voieId },
            {
              entityType: EventEntityTypeEnum.NUMERO,
              entityId: numero.id,
              action: EventActionEnum.UPDATE,
              before: numeroBeforePayload,
              after: numeroAfterPayload,
            },
          )
        : undefined;

    if (numeroEvent) {
      await this.eventService.reparentEvents(
        positionEvents.map((event) => event.id),
        numeroEvent.id,
      );
    }

    // La jonction numero<->toponyme n'est visible que côté event TOPONYME —
    // indépendant du guard ci-dessus, qui ne porte que sur les autres champs.
    if (numero.toponymeId !== numeroUpdated.toponymeId) {
      if (numero.toponymeId) {
        await this.toponymeService.registerNumeroLinkChange(
          numero.balId,
          numero.toponymeId,
          [],
          [numero.id],
        );
      }
      if (numeroUpdated.toponymeId) {
        await this.toponymeService.registerNumeroLinkChange(
          numero.balId,
          numeroUpdated.toponymeId,
          [numero.id],
          [],
        );
      }
    }

    return numeroUpdated;
  }

  public async delete(numero: Numero): Promise<void> {
    // On créer le where et on lance la requète
    const where: FindOptionsWhere<Numero> = {
      id: numero.id,
    };
    const { affected }: DeleteResult =
      await this.numerosRepository.delete(where);
    // Si le numero a été suprimé
    if (affected > 0) {
      // On met a jour le updatedAt de la bal, la voie et le toponyme
      await this.touch(numero);

      const numeroEvent = await this.eventService.register(
        { balId: numero.balId, voieId: numero.voieId },
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
            balId: numero.balId,
            parentEventId: numeroEvent?.id,
            voieId: numero.voieId,
          },
          {
            entityType: EventEntityTypeEnum.POSITION,
            entityId: position.id,
            action: EventActionEnum.DELETE,
            before: serializePosition(position),
          },
        );
      }
      if (numero.toponymeId) {
        await this.toponymeService.registerNumeroLinkChange(
          numero.balId,
          numero.toponymeId,
          [],
          [numero.id],
        );
      }
    }
  }

  public async deleteMany(where: FindOptionsWhere<Numero>) {
    // On supprime les numero
    await this.numerosRepository.delete(where);
  }

  public async certifyVoieNumeros(voie: Voie): Promise<void> {
    await this.numerosRepository.update(
      { voieId: voie.id },
      { certifie: true },
    );
    await this.baseLocaleService.touch(voie.balId);
  }

  public async updateBatch(
    baseLocale: BaseLocale,
    { numerosIds, changes }: UpdateBatchNumeroDTO,
  ): Promise<BatchNumeroResponseDTO> {
    // On récupère les différentes voies et toponymes des numeros qu'on va modifier
    const where: FindOptionsWhere<Numero> = {
      id: In(numerosIds),
      balId: baseLocale.id,
    };
    const voieIds: string[] = await this.findDistinct(where, 'voie_id');
    const toponymeIds: string[] = await this.findDistinct(where, 'toponyme_id');
    // Si la voie des numéro est changé, on vérifie que cette derniere existe bien
    if (
      changes.voieId &&
      !(await this.voieService.isVoieExist(changes.voieId, baseLocale.id))
    ) {
      throw new HttpException('Voie not found', HttpStatus.NOT_FOUND);
    }
    // Si le toponyme des numéro est changé, on vérifie que cet dernier existe bien
    if (
      changes.toponymeId &&
      !(await this.toponymeService.isToponymeExist(
        changes.toponymeId,
        baseLocale.id,
      ))
    ) {
      throw new HttpException('Toponyme not found', HttpStatus.NOT_FOUND);
    }
    // On créer le batch (en omettant positionType qui n'existe pas dans numero)
    const batchChanges: Partial<Numero> = {
      ...(changes.voieId && { voieId: changes.voieId }),
      ...(changes.toponymeId !== undefined && {
        toponymeId: changes.toponymeId,
      }),
      ...pick(changes, ['comment', 'certifie', 'communeDeleguee']),
    };
    // On charge l'état avant modification de chaque numéro concerné, pour
    // le log d'events, avant toute mutation.
    const numerosBefore: Numero[] = await this.numerosRepository.find({
      where,
    });

    // Si le positionType est changé, on change le type de la première position dans le batch
    let positionTypeAffected: number = 0;
    if (changes.positionType) {
      const { affected }: UpdateResult = await this.positionsRepository.update(
        { numeroId: In(numerosIds), rank: 0 },
        { type: changes.positionType },
      );
      positionTypeAffected = affected;
    }
    // On lance la requète
    const { affected }: UpdateResult = await this.numerosRepository.update(
      {
        id: In(numerosIds),
        balId: baseLocale.id,
      },
      batchChanges,
    );

    // Si il y a plus d'un numéro qui a changé
    if (affected > 0 || positionTypeAffected > 0) {
      // On met a jour le updatedAt de la BAL
      await this.baseLocaleService.touch(baseLocale.id);
      // Si la voie a changé
      if (changes.voieId) {
        // On met a jour le updatedAt de la BAL
        await this.voieService.touch(changes.voieId);
        // On recalcule tous les centroid des voies
        await Promise.all(
          voieIds.map((voieId) => this.voieService.calcCentroidAndBbox(voieId)),
        );
        await this.voieService.calcCentroidAndBbox(changes.voieId);
      } else {
        // Sinon on met a jour les updatedAt des voies des numeros
        await Promise.all(
          voieIds.map((voieId) => this.voieService.touch(voieId)),
        );
      }
      // Si on change le toponyme on met a jour son updatedAt
      if (changes.toponymeId) {
        await this.toponymeService.touch(changes.toponymeId);
      }
      // Si les numeros avaient des toponyme, on met a jour leurs updatedAt
      if (toponymeIds.length > 0) {
        await Promise.all(
          toponymeIds.map((toponymeId) =>
            this.toponymeService.touch(toponymeId),
          ),
        );
      }

      // 1 event UPDATE par numéro modifié, tous liés au même event racine.
      const numerosAfter: Numero[] = await this.numerosRepository.find({
        where: { id: In(numerosIds), balId: baseLocale.id },
      });
      const numerosAfterById = new Map(
        numerosAfter.map((numero) => [numero.id, numero]),
      );
      for (const numeroBefore of numerosBefore) {
        const numeroAfter = numerosAfterById.get(numeroBefore.id);
        if (!numeroAfter) {
          continue;
        }
        const beforePayload = serializeNumero(numeroBefore);
        const afterPayload = serializeNumero(numeroAfter);
        // Le batch applique les mêmes changements à tous les numeros de la
        // liste : certains peuvent ne subir aucun changement réel (ex: déjà
        // certifié) — ne pas journaliser d'event dans ce cas.
        if (payloadsAreEqual(beforePayload, afterPayload)) {
          continue;
        }
        await this.eventService.register(
          {
            balId: baseLocale.id,
            parentEventId: null,
            voieId: numeroAfter.voieId,
          },
          {
            entityType: EventEntityTypeEnum.NUMERO,
            entityId: numeroBefore.id,
            action: EventActionEnum.UPDATE,
            before: beforePayload,
            after: afterPayload,
          },
        );
      }

      // Jonction numero<->toponyme, groupée par toponyme impacté : un seul
      // event TOPONYME UPDATE par toponyme touché, même si plusieurs numeros
      // du batch y sont rattachés/détachés d'un coup.
      if (changes.toponymeId !== undefined) {
        const detachedIdsByToponyme = new Map<string, string[]>();
        const attachedIds: string[] = [];
        for (const numeroBefore of numerosBefore) {
          if (numeroBefore.toponymeId === changes.toponymeId) {
            continue;
          }
          if (numeroBefore.toponymeId) {
            const ids =
              detachedIdsByToponyme.get(numeroBefore.toponymeId) ?? [];
            ids.push(numeroBefore.id);
            detachedIdsByToponyme.set(numeroBefore.toponymeId, ids);
          }
          if (changes.toponymeId) {
            attachedIds.push(numeroBefore.id);
          }
        }
        for (const [toponymeId, detachedIds] of detachedIdsByToponyme) {
          await this.toponymeService.registerNumeroLinkChange(
            baseLocale.id,
            toponymeId,
            [],
            detachedIds,
          );
        }
        if (changes.toponymeId && attachedIds.length > 0) {
          await this.toponymeService.registerNumeroLinkChange(
            baseLocale.id,
            changes.toponymeId,
            attachedIds,
            [],
          );
        }
      }
    }

    return { modifiedCount: affected, changes };
  }

  public async deleteBatch(
    baseLocale: BaseLocale,
    { numerosIds }: DeleteBatchNumeroDTO,
  ): Promise<void> {
    // On récupère les différentes voies et toponymes des numeros qu'on va modifier
    const where: FindOptionsWhere<Numero> = {
      id: In(numerosIds),
      balId: baseLocale.id,
    };
    const voieIds: string[] = await this.findDistinct(where, 'voie_id');
    const toponymeIds: string[] = await this.findDistinct(where, 'toponyme_id');
    // On charge les numeros (et leurs positions, chargées eager) avant leur
    // suppression, pour le log d'events.
    const numeros: Numero[] = await this.numerosRepository.find({ where });
    // On supprime les numero dans postgres
    const { affected }: DeleteResult = await this.numerosRepository.delete({
      id: In(numerosIds),
      balId: baseLocale.id,
    });
    // Si des numeros ont été supprimé
    if (affected > 0) {
      // On met a jour le updatedAt de la BAL
      await this.baseLocaleService.touch(baseLocale.id);
      // On met a jour les updatedAt des voies des numeros archivé
      await Promise.all(
        voieIds.map((voieId) => this.voieService.touch(voieId)),
      );
      // Si les numeros avaient des toponyme, on met a jour leurs updatedAt
      if (toponymeIds.length > 0) {
        await Promise.all(
          toponymeIds.map((toponymeId) =>
            this.toponymeService.touch(toponymeId),
          ),
        );
      }

      // 1 event DELETE racine par numéro, chacun avec ses propres positions
      // en enfants (jamais de racine partagée entre numeros).
      for (const numero of numeros) {
        const numeroEvent = await this.eventService.register(
          {
            balId: baseLocale.id,
            parentEventId: null,
            voieId: numero.voieId,
          },
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
              balId: baseLocale.id,
              parentEventId: numeroEvent?.id,
              voieId: numero.voieId,
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

      // Jonction numero<->toponyme, groupée par toponyme impacté : un seul
      // event TOPONYME UPDATE par toponyme touché même si plusieurs numeros
      // supprimés y étaient rattachés.
      const detachedIdsByToponyme = new Map<string, string[]>();
      for (const numero of numeros) {
        if (numero.toponymeId) {
          const ids = detachedIdsByToponyme.get(numero.toponymeId) ?? [];
          ids.push(numero.id);
          detachedIdsByToponyme.set(numero.toponymeId, ids);
        }
      }
      for (const [toponymeId, detachedIds] of detachedIdsByToponyme) {
        await this.toponymeService.registerNumeroLinkChange(
          baseLocale.id,
          toponymeId,
          [],
          detachedIds,
        );
      }
    }
  }

  public async findCentroidAndBboxVoie(
    voieId: string,
  ): Promise<{ centroid: Point; polygon: Polygon } | undefined> {
    const res: { centroid: string; polygon: string } =
      await this.numerosRepository
        .createQueryBuilder('numeros')
        .select(
          'ST_AsGeoJSON(st_centroid(st_union(positions.point)))',
          'centroid',
        )
        .addSelect(
          'ST_AsGeoJSON(ST_Extent(positions.point::geometry))',
          'polygon',
        )
        .leftJoin('numeros.positions', 'positions')
        .where('numeros.voie_id = :voieId', { voieId })
        .groupBy('numeros.voie_id')
        .getRawOne();
    return (
      res && {
        centroid: JSON.parse(res.centroid),
        polygon: JSON.parse(res.polygon),
      }
    );
  }

  async getGenerateDocumentForNumeroParams(numero: Numero) {
    const baseLocale = await this.baseLocaleService.findOneOrFail(numero.balId);
    if (baseLocale.status !== StatusBaseLocalEnum.PUBLISHED) {
      throw new HttpException(
        'La Base Adresse Locale doit être publiée pour pouvoir générer le document',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (!numero.certifie) {
      throw new HttpException(
        'Le numéro doit être certifié pour pouvoir générer le document',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const voie = await this.voieService.findOneOrFail(numero.voieId);
    let toponyme = null;
    if (numero.toponymeId) {
      toponyme = await this.toponymeService.findOneOrFail(numero.toponymeId);
    }

    return { baseLocale, voie, toponyme };
  }

  async generateCertificatAdressage(
    params: GenerateCertificatDTO & { numero: Numero; format?: DocumentFormat },
  ): Promise<string> {
    const { numero, format = DocumentFormat.PDF } = params;

    if (numero.parcelles.length === 0) {
      throw new HttpException(
        'Le numéro doit être rattaché à au moins une parcelle cadastrale pour pouvoir générer le document',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const { baseLocale, voie, toponyme } =
      await this.getGenerateDocumentForNumeroParams(numero);

    const header = await prepareDocumentHeader({
      nom: baseLocale.communeNom,
      code: baseLocale.commune,
    });

    const definition = buildCertificatAdressageDefinition(header, {
      numero,
      baseLocale,
      voie,
      toponyme,
      ...params,
    });

    const { data, contentType, extension } = await generateDocument(
      definition,
      format,
    );

    const fileName = `certificat_adressage_${numero.id}.${extension}`;

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

  async generateArreteDeNumerotation(params: {
    numero: Numero;
    format?: DocumentFormat;
    planDeSituation?: Express.Multer.File;
  }): Promise<string> {
    const { numero, format = DocumentFormat.PDF } = params;
    const { baseLocale, voie, toponyme } =
      await this.getGenerateDocumentForNumeroParams(numero);

    const header = await prepareDocumentHeader({
      nom: baseLocale.communeNom,
      code: baseLocale.commune,
    });

    const planDeSituationImage = params.planDeSituation
      ? await processImageFile(params.planDeSituation)
      : undefined;

    const definition = buildArreteDeNumerotationNumeroDefinition(header, {
      numero,
      baseLocale,
      voie,
      toponyme,
      planDeSituation: planDeSituationImage,
    });

    const { data, contentType, extension } = await generateDocument(
      definition,
      format,
    );

    const fileName = `arrete_de_numerotation_${numero.id}.${extension}`;

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

  async touch(numero: Numero, updatedAt: Date = new Date()) {
    if (numero.toponymeId) {
      await this.toponymeService.touch(numero.toponymeId, updatedAt);
    }
    await this.voieService.touch(numero.voieId, updatedAt);
    await this.baseLocaleService.touch(numero.balId, updatedAt);
  }
}
