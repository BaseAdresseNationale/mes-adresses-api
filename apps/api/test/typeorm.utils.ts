import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { v4 as uuid } from 'uuid';
import { ObjectId } from 'mongodb';
import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';
import { Position } from '@/shared/entities/position.entity';
import { Client } from 'pg';
import { Point, Repository } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { PositionTypeEnum } from '@ban-team/validateur-bal';

// VAR
export const token = 'xxxx';
export const createdAt = new Date('2000-01-01');
export const updatedAt = new Date('2000-01-02');

// DB
let postgresContainer: StartedPostgreSqlContainer;
let postgresClient: Client;
const repositories: {
  numeros: Repository<Numero>;
  voies: Repository<Voie>;
  bals: Repository<BaseLocale>;
  toponymes: Repository<Toponyme>;
} = {
  numeros: null,
  voies: null,
  bals: null,
  toponymes: null,
};

export async function startPostgresContainer() {
  postgresContainer = await new PostgreSqlContainer(
    'postgis/postgis:12-3.0',
  ).start();

  postgresClient = new Client({
    host: postgresContainer.getHost(),
    port: postgresContainer.getPort(),
    database: postgresContainer.getDatabase(),
    user: postgresContainer.getUsername(),
    password: postgresContainer.getPassword(),
  });

  await postgresClient.connect();
}

export function getTypeORMModule() {
  return TypeOrmModule.forRoot({
    type: 'postgres',
    host: postgresContainer.getHost(),
    port: postgresContainer.getPort(),
    username: postgresContainer.getUsername(),
    password: postgresContainer.getPassword(),
    database: postgresContainer.getDatabase(),
    synchronize: true,
    entities: [BaseLocale, Voie, Numero, Toponyme, Position],
  });
}

export function initTypeormRepository(app: INestApplication<any>) {
  repositories.numeros = app.get(getRepositoryToken(Numero));
  repositories.voies = app.get(getRepositoryToken(Voie));
  repositories.bals = app.get(getRepositoryToken(BaseLocale));
  repositories.toponymes = app.get(getRepositoryToken(Toponyme));
}

export function getTypeormRepository() {
  return repositories;
}

export async function deleteRepositories() {
  await repositories.numeros.delete({});
  await repositories.voies.delete({});
  await repositories.bals.delete({});
  await repositories.toponymes.delete({});
}

export async function stopPostgresContainer() {
  await postgresClient.end();
  await postgresContainer.stop();
}

export async function createBal(props: Partial<BaseLocale> = {}) {
  const payload: Partial<BaseLocale> = {
    banId: uuid(),
    createdAt: createdAt,
    updatedAt: updatedAt,
    status: props.status ?? StatusBaseLocalEnum.DRAFT,
    token: token,
    ...props,
  };
  const entityToInsert = repositories.bals.create(payload);
  const result = await repositories.bals.save(entityToInsert);
  return result.id;
}

export async function createVoie(balId: string, props: Partial<Voie> = {}) {
  const payload: Partial<Voie> = {
    balId,
    banId: uuid(),
    createdAt: createdAt,
    updatedAt: updatedAt,
    ...props,
  };
  const entityToInsert = repositories.voies.create(payload);
  const result = await repositories.voies.save(entityToInsert);
  return result.id;
}

export async function createToponyme(
  balId: string,
  props: Partial<Toponyme> = {},
) {
  const payload: Partial<Toponyme> = {
    balId,
    banId: uuid(),
    createdAt: createdAt,
    updatedAt: updatedAt,
    ...props,
  };
  const entityToInsert = repositories.toponymes.create(payload);
  const result = await repositories.toponymes.save(entityToInsert);
  return result.id;
}

export async function createNumero(
  balId: string,
  voieId: string,
  props: Partial<Numero> = {},
) {
  const payload: Partial<Numero> = {
    balId,
    banId: uuid(),
    voieId,
    createdAt: createdAt,
    updatedAt: updatedAt,
    ...props,
  };
  const entityToInsert = repositories.numeros.create(payload);
  const result = await repositories.numeros.save(entityToInsert);
  return result.id;
}

export function createPositions(coordinates: number[] = [8, 42]): Position {
  const id = new ObjectId().toHexString();
  const point: Point = {
    type: 'Point',
    coordinates,
  };
  return {
    id,
    type: PositionTypeEnum.ENTREE,
    source: 'ban',
    point,
  } as Position;
}
