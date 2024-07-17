import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model, Types } from 'mongoose';
import * as nodemailer from 'nodemailer';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { v4 as uuid } from 'uuid';

import { Numero } from '@/shared/schemas/numero/numero.schema';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { PositionTypeEnum } from '@/shared/schemas/position_type.enum';
import { Position } from '@/shared/schemas/position.schema';

import { BaseLocaleModule } from '@/modules/base_locale/base_locale.module';
import { UpdateBatchNumeroDTO } from '@/modules/numeros/dto/update_batch_numero.dto';
import { DeleteBatchNumeroDTO } from '@/modules/numeros/dto/delete_batch_numero.dto';
import { StatusBaseLocalEnum } from '@/shared/schemas/base_locale/status.enum';
import { CreateVoieDTO } from '@/modules/voie/dto/create_voie.dto';
import { TypeNumerotationEnum } from '@/shared/schemas/voie/type_numerotation.enum';
import { CreateToponymeDTO } from '@/modules/toponyme/dto/create_toponyme.dto';

const BAN_API_URL = 'BAN_API_URL';
process.env.BAN_API_URL = BAN_API_URL;

const baseLocaleAdminProperties = ['token', 'emails'];
const baseLocalePublicProperties = [
  'nom',
  'commune',
  '_updated',
  'nbNumeros',
  'nbNumerosCertifies',
  'isAllCertified',
  'commentedNumeros',
  'status',
  '_created',
  '_deleted',
  '_id',
  '__v',
];

jest.mock('nodemailer');

const createTransport = nodemailer.createTransport;

describe('BASE LOCAL MODULE', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let numeroModel: Model<Numero>;
  let voieModel: Model<Voie>;
  let balModel: Model<BaseLocale>;
  let toponymeModel: Model<Toponyme>;
  // VAR
  const token = 'xxxx';
  const _created = new Date('2000-01-01');
  const _updated = new Date('2000-01-02');
  // AXIOS
  const axiosMock = new MockAdapter(axios);
  // NODEMAILER
  const sendMailMock = jest.fn();
  createTransport.mockReturnValue({ sendMail: sendMailMock });

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), BaseLocaleModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // INIT MODEL
    numeroModel = app.get<Model<Numero>>(getModelToken(Numero.name));
    voieModel = app.get<Model<Voie>>(getModelToken(Voie.name));
    balModel = app.get<Model<BaseLocale>>(getModelToken(BaseLocale.name));
    toponymeModel = app.get<Model<Toponyme>>(getModelToken(Toponyme.name));
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
    await app.close();
  });

  afterEach(async () => {
    axiosMock.reset();
    await toponymeModel.deleteMany({});
    await voieModel.deleteMany({});
    await balModel.deleteMany({});
    await numeroModel.deleteMany({});
    sendMailMock.mockReset();
  });

  async function createBal(props: Partial<BaseLocale> = {}) {
    const balId = new Types.ObjectId();
    const bal: Partial<BaseLocale> = {
      _id: balId,
      _created,
      _updated,
      status: props.status ?? StatusBaseLocalEnum.DRAFT,
      token,
      ...props,
    };
    await balModel.create(bal);
    return balId;
  }

  async function createVoie(props: Partial<Voie> = {}) {
    const voieId = new Types.ObjectId();
    const voie: Partial<Voie> = {
      _id: voieId,
      _created,
      _updated,
      ...props,
    };
    await voieModel.create(voie);
    return voieId;
  }

  async function createToponyme(props: Partial<Toponyme> = {}) {
    const toponymeId = new Types.ObjectId();
    const toponyme: Partial<Toponyme> = {
      _id: toponymeId,
      _created,
      _updated,
      ...props,
    };
    await toponymeModel.create(toponyme);
    return toponymeId;
  }

  async function createNumero(props: Partial<Numero> = {}) {
    const numeroId = new Types.ObjectId();
    const numero: Partial<Numero> = {
      _id: numeroId,
      _created,
      _updated,
      ...props,
    };
    await numeroModel.create(numero);
    return numeroId;
  }

  function createPositions(coordinates: number[] = [8, 42]): Position[] {
    return [
      {
        type: PositionTypeEnum.INCONNUE,
        source: 'ban',
        point: {
          type: 'Point',
          coordinates,
        },
      },
    ];
  }

  describe('PUT /bases-locales/numeros/batch', () => {
    it('Batch 200 numeros change voie', async () => {
      const balId = await createBal();
      const voieId1 = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const toponymeId1 = await createToponyme({
        nom: 'allée',
        _bal: balId,
      });
      const toponymeId2 = await createToponyme({
        nom: 'allée',
        _bal: balId,
      });
      const voieId2 = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const voieId3 = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId1 = await createNumero({
        _bal: balId,
        voie: voieId1,
        numero: 99,
        positions: createPositions(),
        toponyme: toponymeId1,
      });
      const numeroId2 = await createNumero({
        _bal: balId,
        voie: voieId2,
        numero: 99,
        positions: createPositions(),
        toponyme: toponymeId2,
      });

      const updateBtach: UpdateBatchNumeroDTO = {
        numerosIds: [numeroId1, numeroId2],
        changes: {
          voie: voieId3,
          toponyme: toponymeId2,
          positionType: PositionTypeEnum.DELIVRANCE_POSTALE,
          certifie: true,
          comment: 'coucou',
        },
      };

      const response = await request(app.getHttpServer())
        .put(`/bases-locales/${balId}/numeros/batch`)
        .send(updateBtach)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.modifiedCount).toEqual(2);
      expect(response.body.changes).toEqual({
        voie: voieId3.toString(),
        toponyme: toponymeId2.toString(),
        positionType: PositionTypeEnum.DELIVRANCE_POSTALE,
        certifie: true,
        comment: 'coucou',
      });

      const numero1After: Numero = await numeroModel.findOne({
        _id: numeroId1,
      });
      expect(numero1After._updated).not.toEqual(_updated.toISOString());
      expect(numero1After.voie).toEqual(voieId3);
      expect(numero1After.positions[0].type).toEqual(
        PositionTypeEnum.DELIVRANCE_POSTALE,
      );
      expect(numero1After.certifie).toBeTruthy();
      expect(numero1After.comment).toEqual('coucou');

      const numero2After: Numero = await numeroModel.findOne({
        _id: numeroId2,
      });
      expect(numero2After._updated).not.toEqual(_updated.toISOString());
      expect(numero2After.voie).toEqual(voieId3);
      expect(numero2After.positions[0].type).toEqual(
        PositionTypeEnum.DELIVRANCE_POSTALE,
      );
      expect(numero2After.certifie).toBeTruthy();
      expect(numero2After.comment).toEqual('coucou');

      const voie1After: Voie = await voieModel.findOne({ _id: voieId1 });
      expect(voie1After._updated).not.toEqual(_updated.toISOString());
      expect(voie1After.centroid).toBeNull();
      expect(voie1After.centroidTiles).toBeNull();

      const voie2After: Voie = await voieModel.findOne({ _id: voieId2 });
      expect(voie2After._updated).not.toEqual(_updated.toISOString());
      expect(voie2After.centroid).toBeNull();
      expect(voie2After.centroidTiles).toBeNull();

      const voie3After: Voie = await voieModel.findOne({ _id: voieId3 });
      expect(voie3After._updated).not.toEqual(_updated.toISOString());
      expect(voie3After.centroid).not.toBeNull();
      expect(voie3After.centroidTiles).not.toBeNull();

      const toponymeAfter1: Toponyme = await toponymeModel.findOne({
        _id: toponymeId1,
      });
      expect(toponymeAfter1._updated).not.toEqual(_updated.toISOString());

      const toponymeAfter2: Toponyme = await toponymeModel.findOne({
        _id: toponymeId2,
      });
      expect(toponymeAfter2._updated).not.toEqual(_updated.toISOString());

      const balAfter: BaseLocale = await balModel.findOne({ _id: balId });
      expect(balAfter._updated).not.toEqual(_updated.toISOString());
    });

    it('PUT /bases-locales/numeros/certify-all', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
        positions: createPositions(),
        certifie: false,
      });

      await request(app.getHttpServer())
        .put(`/bases-locales/${balId}/numeros/certify-all`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      const numeroAfter: Numero = await numeroModel.findOne({
        _id: numeroId,
      });
      expect(numeroAfter.certifie).toBeTruthy();
    });

    it('Batch 400 without changes', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
        positions: createPositions(),
      });
      const updateBtach: UpdateBatchNumeroDTO = {
        numerosIds: [numeroId],
        changes: {},
      };

      await request(app.getHttpServer())
        .put(`/bases-locales/${balId}/numeros/batch`)
        .send(updateBtach)
        .set('authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('Batch 404 numeros: Bad voie', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
        positions: createPositions(),
      });
      const updateBtach: UpdateBatchNumeroDTO = {
        numerosIds: [numeroId],
        changes: {
          voie: new Types.ObjectId(),
        },
      };

      await request(app.getHttpServer())
        .put(`/bases-locales/${balId}/numeros/batch`)
        .send(updateBtach)
        .set('authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('Batch 404 numeros: Bad toponyme', async () => {
      const balId = await createBal();
      const voieId = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId = await createNumero({
        _bal: balId,
        voie: voieId,
        numero: 99,
        positions: createPositions(),
      });
      const updateBtach: UpdateBatchNumeroDTO = {
        numerosIds: [numeroId],
        changes: {
          toponyme: new Types.ObjectId(),
        },
      };

      await request(app.getHttpServer())
        .put(`/bases-locales/${balId}/numeros/batch`)
        .send(updateBtach)
        .set('authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PUT /bases-locales/numeros/batch/soft-delete', () => {
    it('Soft Delete 200', async () => {
      const balId = await createBal();
      const voieId1 = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const toponymeId1 = await createToponyme({
        nom: 'allée',
        _bal: balId,
      });
      const toponymeId2 = await createToponyme({
        nom: 'allée',
        _bal: balId,
      });
      const voieId2 = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId1 = await createNumero({
        _bal: balId,
        voie: voieId1,
        numero: 99,
        positions: createPositions(),
        toponyme: toponymeId1,
      });
      const numeroId2 = await createNumero({
        _bal: balId,
        voie: voieId2,
        numero: 99,
        positions: createPositions(),
        toponyme: toponymeId2,
      });

      const deleteBtach: DeleteBatchNumeroDTO = {
        numerosIds: [numeroId1, numeroId2],
      };

      const response = await request(app.getHttpServer())
        .put(`/bases-locales/${balId}/numeros/batch/soft-delete`)
        .send(deleteBtach)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.modifiedCount).toEqual(2);
      const numero1After: Numero = await numeroModel.findOne({
        _id: numeroId1,
      });
      expect(numero1After._updated).not.toEqual(_updated.toISOString());
      expect(numero1After._deleted).toBeDefined();

      const numero2After: Numero = await numeroModel.findOne({
        _id: numeroId2,
      });
      expect(numero2After._updated).not.toEqual(_updated.toISOString());
      expect(numero2After._deleted).toBeDefined();

      const voie1After: Voie = await voieModel.findOne({ _id: voieId1 });
      expect(voie1After._updated).not.toEqual(_updated.toISOString());
      expect(voie1After.centroid).toBeNull();
      expect(voie1After.centroidTiles).toBeNull();

      const voie2After: Voie = await voieModel.findOne({ _id: voieId2 });
      expect(voie2After._updated).not.toEqual(_updated.toISOString());
      expect(voie2After.centroid).toBeNull();
      expect(voie2After.centroidTiles).toBeNull();

      const toponymeAfter1: Toponyme = await toponymeModel.findOne({
        _id: toponymeId1,
      });
      expect(toponymeAfter1._updated).not.toEqual(_updated.toISOString());

      const toponymeAfter2: Toponyme = await toponymeModel.findOne({
        _id: toponymeId2,
      });
      expect(toponymeAfter2._updated).not.toEqual(_updated.toISOString());

      const balAfter: BaseLocale = await balModel.findOne({ _id: balId });
      expect(balAfter._updated).not.toEqual(_updated.toISOString());
    });

    it('Soft Delete 400: Bad request', async () => {
      const balId = await createBal();
      const deleteBtach: DeleteBatchNumeroDTO = {
        numerosIds: [],
      };

      await request(app.getHttpServer())
        .put(`/bases-locales/${balId}/numeros/batch/soft-delete`)
        .send(deleteBtach)
        .set('authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('DELETE /bases-locales/numeros/batch', () => {
    it('Delete 204', async () => {
      const balId = await createBal();
      const voieId1 = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const toponymeId1 = await createToponyme({
        nom: 'allée',
        _bal: balId,
      });
      const toponymeId2 = await createToponyme({
        nom: 'allée',
        _bal: balId,
      });
      const voieId2 = await createVoie({ nom: 'rue de la paix', _bal: balId });
      const numeroId1 = await createNumero({
        _bal: balId,
        voie: voieId1,
        numero: 99,
        positions: createPositions(),
        toponyme: toponymeId1,
      });
      const numeroId2 = await createNumero({
        _bal: balId,
        voie: voieId2,
        numero: 99,
        positions: createPositions(),
        toponyme: toponymeId2,
      });

      const deleteBtach: DeleteBatchNumeroDTO = {
        numerosIds: [numeroId1, numeroId2],
      };

      await request(app.getHttpServer())
        .delete(`/bases-locales/${balId}/numeros/batch/`)
        .send(deleteBtach)
        .set('authorization', `Bearer ${token}`)
        .expect(204);

      const numero1After: Numero = await numeroModel.findOne({
        _id: numeroId1,
      });
      expect(numero1After).toBeNull();

      const numero2After: Numero = await numeroModel.findOne({
        _id: numeroId2,
      });
      expect(numero2After).toBeNull();

      const voie1After: Voie = await voieModel.findOne({ _id: voieId1 });
      expect(voie1After._updated).not.toEqual(_updated.toISOString());
      expect(voie1After.centroid).toBeNull();
      expect(voie1After.centroidTiles).toBeNull();

      const voie2After: Voie = await voieModel.findOne({ _id: voieId2 });
      expect(voie2After._updated).not.toEqual(_updated.toISOString());
      expect(voie2After.centroid).toBeNull();
      expect(voie2After.centroidTiles).toBeNull();

      const toponymeAfter1: Toponyme = await toponymeModel.findOne({
        _id: toponymeId1,
      });
      expect(toponymeAfter1._updated).not.toEqual(_updated.toISOString());

      const toponymeAfter2: Toponyme = await toponymeModel.findOne({
        _id: toponymeId2,
      });
      expect(toponymeAfter2._updated).not.toEqual(_updated.toISOString());

      const balAfter: BaseLocale = await balModel.findOne({ _id: balId });
      expect(balAfter._updated).not.toEqual(_updated.toISOString());
    });

    it('Delete 400: Bad request', async () => {
      const balId = await createBal();
      const deleteBtach: DeleteBatchNumeroDTO = {
        numerosIds: [],
      };

      await request(app.getHttpServer())
        .delete(`/bases-locales/${balId}/numeros/batch`)
        .send(deleteBtach)
        .set('authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('GET /bases-locales/csv', () => {
    it('Delete 204', async () => {
      const communeUuid = uuid();
      const balId = await createBal({
        banId: communeUuid,
      });
      const voieUuid1 = uuid();
      const voieId1 = await createVoie({
        nom: 'rue de la paix',
        commune: '91534',
        _bal: balId,
        banId: voieUuid1,
      });
      const voieUuid2 = uuid();
      const voieId2 = await createVoie({
        nom: 'rue de paris',
        commune: '91534',
        _bal: balId,
        banId: voieUuid2,
      });
      const toponymeUuid1 = uuid();
      const toponymeId1 = await createToponyme({
        nom: 'allée',
        commune: '91534',
        _bal: balId,
        banId: toponymeUuid1,
      });
      const numeroUuid1 = uuid();
      const numeroId1 = await createNumero({
        _bal: balId,
        banId: numeroUuid1,
        voie: voieId1,
        numero: 1,
        suffixe: 'bis',
        positions: createPositions(),
        toponyme: toponymeId1,
        certifie: true,
        commune: '91534',
      });
      const numeroUuid2 = uuid();
      const numeroId2 = await createNumero({
        _bal: balId,
        banId: numeroUuid2,
        voie: voieId2,
        numero: 1,
        suffixe: 'ter',
        positions: createPositions(),
        toponyme: toponymeId1,
        certifie: false,
        commune: '91534',
      });

      const deleteBtach: DeleteBatchNumeroDTO = {
        numerosIds: [numeroId1, numeroId2],
      };

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/csv`)
        .send(deleteBtach)
        .set('token', token)
        .expect(200);

      expect(response.headers['content-disposition']).toEqual(
        'attachment; filename="bal.csv"',
      );
      expect(response.headers['content-type']).toEqual(
        'text/csv; charset=utf-8',
      );

      const csvFile = `cle_interop;id_ban_commune;id_ban_toponyme;id_ban_adresse;voie_nom;lieudit_complement_nom;numero;suffixe;certification_commune;commune_insee;commune_nom;position;long;lat;x;y;cad_parcelles;source;date_der_maj
91534_xxxx_00001_bis;${communeUuid};${voieUuid1};${numeroUuid1};rue de la paix;allée;1;bis;1;91534;Saclay;inconnue;8;42;1114835.92;6113076.85;;ban;2000-01-02
91534_xxxx_00001_ter;${communeUuid};${voieUuid2};${numeroUuid2};rue de paris;allée;1;ter;0;91534;Saclay;inconnue;8;42;1114835.92;6113076.85;;ban;2000-01-02
91534_xxxx_99999;${communeUuid};${toponymeUuid1};;allée;;99999;;;91534;Saclay;;;;;;;commune;2000-01-02`;
      expect(response.text.replace(/\s/g, '')).toEqual(
        csvFile.replace(/\s/g, ''),
      );
    });
  });

  describe('GET /bases-locales/csv', () => {
    it('Delete 204', async () => {
      const balId = await createBal();
      const voieId1 = await createVoie({
        nom: 'rue de la paix',
        commune: '91534',
        _bal: balId,
      });
      const voieId2 = await createVoie({
        nom: 'rue de paris',
        commune: '91534',
        _bal: balId,
      });
      const numeroId1 = await createNumero({
        _bal: balId,
        voie: voieId1,
        numero: 1,
        suffixe: 'bis',
        positions: createPositions(),
        certifie: true,
        commune: '91534',
        _updated: new Date('2000-01-01'),
      });
      const numeroId2 = await createNumero({
        _bal: balId,
        voie: voieId2,
        numero: 1,
        suffixe: 'ter',
        positions: createPositions(),
        certifie: false,
        commune: '91534',
        _updated: new Date('2000-01-01'),
      });

      const deleteBtach: DeleteBatchNumeroDTO = {
        numerosIds: [numeroId1, numeroId2],
      };

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/voies/csv`)
        .send(deleteBtach)
        .set('token', token)
        .expect(200);

      expect(response.headers['content-disposition']).toEqual(
        'attachment; filename="liste-des-voies.csv"',
      );
      expect(response.headers['content-type']).toEqual(
        'text/csv; charset=utf-8',
      );

      const csvFile = `type;nom;nombre_de_numeros;numeros
voie;rue de la paix;1;1bis
voie;rue de paris;1;1ter`;
      expect(response.text.replace(/\s/g, '')).toEqual(
        csvFile.replace(/\s/g, ''),
      );
    });
  });

  describe('GET /bases-locales/search', () => {
    it('Search 200', async () => {
      const balId1 = await createBal({
        token: 'coucou',
        emails: ['living@data.com'],
        commune: '55326',
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/search?commune=55326&email=living@data.com`)
        .expect(200);

      const results = [
        {
          _id: balId1.toString(),
          commune: '55326',
          __v: 0,
          nbNumeros: 0,
          nbNumerosCertifies: 0,
          isAllCertified: false,
          commentedNumeros: [],
          status: 'draft',
          _created: _created.toISOString(),
          _updated: _updated.toISOString(),
          _deleted: null,
        },
      ];

      expect(response.body.count).toEqual(1);
      expect(response.body.offset).toEqual(0);
      expect(response.body.limit).toEqual(20);
      expect(response.body.results).toEqual(results);
    });
  });

  describe('POST /bases-locales', () => {
    it('Create 200', async () => {
      const createBALDTO = {
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      };

      const resBan = {
        response: [
          {
            id: uuid(),
          },
        ],
      };

      axiosMock
        .onGet(`${BAN_API_URL}/api/district/cog/27115`)
        .reply(200, resBan);

      const response = await request(app.getHttpServer())
        .post(`/bases-locales`)
        .send(createBALDTO)
        .expect(200);

      expect(response.body).toMatchObject({
        nom: 'foo',
        emails: ['me@domain.co'],
        status: 'draft',
        commune: '27115',
        _deleted: null,
      });
      expect(sendMailMock).toHaveBeenCalled();
    });

    it('Create a BaseLocale with invalid payload 400', async () => {
      const createBALDTO = {};
      const response = await request(app.getHttpServer())
        .post(`/bases-locales`)
        .send(createBALDTO)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Bad Request',
        message: [
          'nom should not be empty',
          'each value in emails must be an email',
          'emails should not be empty',
          "Le champ commune : undefined n'est pas valide",
        ],
        statusCode: 400,
      });
      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it('Create a BaseLocale with invalid commune 400', async () => {
      const createBALDTO = {
        nom: 'foo',
        emails: ['me@domain.co'],
        commune: '00000',
      };
      const response = await request(app.getHttpServer())
        .post(`/bases-locales`)
        .send(createBALDTO)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Bad Request',
        message: ["Le champ commune : 00000 n'est pas valide"],
        statusCode: 400,
      });
      expect(sendMailMock).not.toHaveBeenCalled();
    });
  });

  describe('GET /bases-locales/:id', () => {
    it('Get 200 with admin token', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);

      expect(
        Object.keys(response.body).sort((a, b) => a.localeCompare(b)),
      ).toEqual(
        [...baseLocaleAdminProperties, ...baseLocalePublicProperties].sort(
          (a, b) => a.localeCompare(b),
        ),
      );
    });

    it('Get 200 without admin token', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}`)
        .expect(200);

      expect(
        Object.keys(response.body).sort((a, b) => a.localeCompare(b)),
      ).toEqual(baseLocalePublicProperties.sort((a, b) => a.localeCompare(b)));
    });

    it('Get 404 with invalid ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/bases-locales/5f7b3b7b5d6e4a0017d0d0d0`)
        .expect(404);

      expect(response.body).toEqual({
        message: 'BaseLocale 5f7b3b7b5d6e4a0017d0d0d0 not found',
        statusCode: 404,
      });
    });

    it('Count numeros & certified numeros', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      await createNumero({
        _bal: balId,
        numero: 1,
        certifie: true,
      });

      await createNumero({
        _bal: balId,
        numero: 2,
        certifie: false,
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}`)
        .expect(200);

      expect(response.body.nbNumeros).toEqual(2);
      expect(response.body.nbNumerosCertifies).toEqual(1);
      expect(response.body.isAllCertified).toEqual(false);
    });

    it('Count numeros & certified numeros / all certified', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      await createNumero({
        _bal: balId,
        numero: 1,
        certifie: true,
      });

      await createNumero({
        _bal: balId,
        numero: 2,
        certifie: true,
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}`)
        .expect(200);

      expect(response.body.nbNumeros).toEqual(2);
      expect(response.body.nbNumerosCertifies).toEqual(2);
      expect(response.body.isAllCertified).toEqual(true);
    });

    it('Commented numeros', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      await createNumero({
        _bal: balId,
        numero: 1,
        comment: 'blabla',
      });

      await createNumero({
        _bal: balId,
        numero: 2,
        comment: 'blibli',
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}`)
        .expect(200);

      expect(response.body.commentedNumeros.length).toEqual(2);
      expect(response.body.commentedNumeros[0].numero).toEqual(1);
      expect(response.body.commentedNumeros[0].comment).toEqual('blabla');
      expect(response.body.commentedNumeros[1].numero).toEqual(2);
      expect(response.body.commentedNumeros[1].comment).toEqual('blibli');
    });
  });

  describe('PUT /bases-locales/:id', () => {
    it('Update 200 with admin token', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      const updateBALDTO = {
        nom: 'bar',
        commune: '27115',
        emails: ['me@domain.co', 'metoo@domain.co'],
      };

      const response = await request(app.getHttpServer())
        .put(`/bases-locales/${balId}`)
        .set('authorization', `Bearer ${token}`)
        .send(updateBALDTO)
        .expect(200);

      expect(response.body.nom).toEqual('bar');
      expect(response.body.emails).toEqual(['me@domain.co', 'metoo@domain.co']);
      expect(sendMailMock).toHaveBeenCalled();
    });

    it('Update 403 without admin token', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      const updateBALDTO = {
        nom: 'bar',
        commune: '27115',
        emails: ['me@domain.co', 'metoo@domain.co'],
      };

      await request(app.getHttpServer())
        .put(`/bases-locales/${balId}`)
        .send(updateBALDTO)
        .expect(403);
      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it('Update 400 invalid payload', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      const updateBALDTO = {
        nom: '',
        emails: [],
        status: 'blabla',
      };

      const response = await request(app.getHttpServer())
        .put(`/bases-locales/${balId}`)
        .set('authorization', `Bearer ${token}`)
        .send(updateBALDTO)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Bad Request',
        message: [
          'nom should not be empty',
          'status must be one of the following values: draft, published, demo, replaced',
          'emails should not be empty',
        ],
        statusCode: 400,
      });
      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it('Update 412 modify a demo base locale', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
        status: StatusBaseLocalEnum.DEMO,
      });

      const updateBALDTO = {
        status: StatusBaseLocalEnum.PUBLISHED,
      };

      await request(app.getHttpServer())
        .put(`/bases-locales/${balId}`)
        .set('authorization', `Bearer ${token}`)
        .send(updateBALDTO)
        .expect(412);
    });

    it('Update 412 modify a published base locale', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
        status: StatusBaseLocalEnum.PUBLISHED,
      });

      const updateBALDTO = {
        status: StatusBaseLocalEnum.DEMO,
      };

      await request(app.getHttpServer())
        .put(`/bases-locales/${balId}`)
        .set('authorization', `Bearer ${token}`)
        .send(updateBALDTO)
        .expect(412);
    });
  });

  describe('PUT /bases-locales/:id/transform-to-draft', () => {
    it('Transform to draft 200', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: [],
        status: StatusBaseLocalEnum.DEMO,
      });

      const response = await request(app.getHttpServer())
        .put(`/bases-locales/${balId}/transform-to-draft`)
        .set('authorization', `Bearer ${token}`)
        .send({ nom: 'bar', email: 'me@mail.co' })
        .expect(200);

      expect(response.body).toMatchObject({
        nom: 'bar',
        emails: ['me@mail.co'],
        status: 'draft',
      });
    });

    it('Transform to draft 412', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
        status: StatusBaseLocalEnum.DRAFT,
      });

      const response = await request(app.getHttpServer())
        .put(`/bases-locales/${balId}/transform-to-draft`)
        .set('authorization', `Bearer ${token}`)
        .send({ nom: 'bar', email: 'me@mail.co' })
        .expect(412);

      expect(response.body).toEqual({
        message:
          'La Base Adresse Locale n’est pas une Base Adresse Locale de démonstration.',
        statusCode: 412,
      });
    });
  });

  describe('DELETE /bases-locales/:id', () => {
    it('Delete BAL with admin token (soft delete) 204', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      await request(app.getHttpServer())
        .delete(`/bases-locales/${balId}`)
        .set('authorization', `Bearer ${token}`)
        .expect(204);

      const baseLocale = await balModel.findOne({ _id: balId });

      expect(baseLocale._deleted).not.toBeNull();
    });

    it('Delete demo BAL with admin token (hard delete) 204', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
        status: StatusBaseLocalEnum.DEMO,
      });

      await request(app.getHttpServer())
        .delete(`/bases-locales/${balId}`)
        .set('authorization', `Bearer ${token}`)
        .expect(204);

      const baseLocale = await balModel.findOne({ _id: balId });

      expect(baseLocale).toBeNull();
    });

    it('Delete BAL without admin token 403', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      await request(app.getHttpServer())
        .delete(`/bases-locales/${balId}`)
        .expect(403);
    });
  });

  describe('GET /bases-locales/:id/:token/recovery', () => {
    it('Restore deleted BAL', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
        _deleted: new Date(),
      });

      await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/${token}/recovery`)
        .expect(307);

      const baseLocale = await balModel.findOne({ _id: balId });

      expect(baseLocale._deleted).toBeNull();
    });

    it('Restore deleted BAL / invalid token', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
        _deleted: new Date(),
      });

      await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/blabla/recovery`)
        .expect(403);
    });
  });

  describe('POST /bases-locales/recovery', () => {
    it('Renew token', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
        _deleted: new Date(),
      });

      const body = {
        id: balId,
        email: 'me@domain.co',
      };

      await request(app.getHttpServer())
        .post(`/bases-locales/recovery`)
        .send(body)
        .expect(204);

      expect(sendMailMock).toHaveBeenCalled();
    });

    it('Renew token / invalid balId', async () => {
      const body = {
        id: '42',
        email: 'me@domain.co',
      };

      await request(app.getHttpServer())
        .post(`/bases-locales/recovery`)
        .send(body)
        .expect(400);

      expect(sendMailMock).not.toHaveBeenCalled();
    });
  });

  describe('GET /bases-locales/:id/parcelles', () => {
    it('GET all assigned parcelles', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
        _deleted: new Date(),
      });

      await createNumero({
        _bal: balId,
        numero: 1,
        commune: '27115',
        parcelles: ['12345000AA0002'],
      });

      await createToponyme({
        _bal: balId,
        commune: '27115',
        parcelles: ['12345000AA0002', '12345000AA0005'],
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/parcelles`)
        .expect(200);

      expect(response.body).toEqual(['12345000AA0002', '12345000AA0005']);
    });
  });

  describe('GET /:baseLocaleId/voies', () => {
    it('GET default not deleted', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      const voieId = await createVoie({
        _bal: balId,
        nom: 'rue de la paix',
      });

      createNumero({
        voie: voieId,
        numero: 1,
      });

      createNumero({
        voie: voieId,
        numero: 1,
        certifie: true,
      });

      createNumero({
        voie: voieId,
        numero: 1,
        _deleted: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/voies`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toEqual(voieId.toString());
      expect(response.body[0].nbNumeros).toEqual(2);
      expect(response.body[0].nbNumerosCertifies).toEqual(1);
      expect(response.body[0].isAllCertified).toBeFalsy();
    });
  });

  describe('POST /:baseLocaleId/voies', () => {
    it('POST 201', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      const voie: CreateVoieDTO = {
        nom: 'rue de la paix',
        nomAlt: null,
        trace: null,
        typeNumerotation: TypeNumerotationEnum.NUMERIQUE,
      };

      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/voies`)
        .set('authorization', `Bearer ${token}`)
        .send(voie)
        .expect(201);

      expect(response.body._id).toBeDefined();
      expect(response.body.nom).toEqual('rue de la paix');
      expect(response.body.nomAlt).toBeNull();
      expect(response.body.trace).toBeNull();
      expect(response.body.typeNumerotation).toEqual(
        TypeNumerotationEnum.NUMERIQUE,
      );
      expect(response.body.traceTiles).toBeNull();
      expect(response.body.centroid).toBeNull();
      expect(response.body.centroidTiles).toBeNull();
      expect(response.body._deleted).toBeNull();
      expect(response.body._updated).toBeDefined();
      expect(response.body._created).toBeDefined();
    });

    it('POST 403', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      const voie: CreateVoieDTO = {
        nom: 'rue de la paix',
        nomAlt: null,
        trace: null,
        typeNumerotation: TypeNumerotationEnum.NUMERIQUE,
      };

      await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/voies`)
        .send(voie)
        .expect(403);
    });
  });

  describe('GET /:baseLocaleId/toponymes', () => {
    it('GET default not deleted', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      const toponymeId = await createToponyme({
        _bal: balId,
        nom: 'rue de la paix',
      });

      await createToponyme({
        _bal: balId,
        nom: 'rue de paris',
        _deleted: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/toponymes`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]._id).toEqual(toponymeId.toString());
    });
  });

  describe('POST /:baseLocaleId/toponymes', () => {
    it('POST 201', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      const toponyme: CreateToponymeDTO = {
        nom: 'rue de la paix',
        nomAlt: null,
      };

      const response = await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/toponymes`)
        .set('authorization', `Bearer ${token}`)
        .send(toponyme)
        .expect(201);

      expect(response.body._id).toBeDefined();
      expect(response.body.nom).toEqual('rue de la paix');
      expect(response.body.nomAlt).toBeNull();
      expect(response.body.positions).toEqual([]);
      expect(response.body.positions).toEqual([]);
      expect(response.body.commune).toEqual('27115');
    });

    it('POST 403', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });

      const toponyme: CreateToponymeDTO = {
        nom: 'rue de la paix',
        nomAlt: null,
      };

      await request(app.getHttpServer())
        .post(`/bases-locales/${balId}/toponymes`)
        .send(toponyme)
        .expect(403);
    });
  });

  describe('GET /:baseLocaleId/all/deleted', () => {
    it('GET 200 voie deleted', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });
      const voieId = await createVoie({
        _bal: balId,
        nom: 'rue de la paix',
        _deleted: new Date(),
      });
      await createVoie({
        _bal: balId,
        nom: 'rue de la paix',
      });
      const toponymeId = await createToponyme({
        _bal: balId,
        nom: 'rue de la paix',
        _deleted: new Date(),
      });
      await createToponyme({
        _bal: balId,
        nom: 'rue de la paix',
      });

      const numeroId = await createNumero({
        _bal: balId,
        numero: 1,
        voie: voieId,
        _deleted: new Date(),
      });

      await createNumero({
        _bal: balId,
        numero: 1,
        voie: voieId,
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/all/deleted`)
        .expect(200);

      expect(response.body.toponymes).toHaveLength(1);
      expect(response.body.toponymes[0]._id).toEqual(toponymeId.toString());
      expect(response.body.voies).toHaveLength(1);
      expect(response.body.voies[0]._id).toEqual(voieId.toString());
      expect(response.body.voies[0].numeros).toHaveLength(1);
      expect(response.body.voies[0].numeros[0]._id).toEqual(
        numeroId.toString(),
      );
    });

    it('GET 200 voie not deleted', async () => {
      const balId = await createBal({
        nom: 'foo',
        commune: '27115',
        emails: ['me@domain.co'],
      });
      const voieId = await createVoie({
        _bal: balId,
        nom: 'rue de la paix',
      });
      await createVoie({
        _bal: balId,
        nom: 'rue de la paix',
      });
      const toponymeId = await createToponyme({
        _bal: balId,
        nom: 'rue de la paix',
        _deleted: new Date(),
      });
      await createToponyme({
        _bal: balId,
        nom: 'rue de la paix',
      });

      const numeroId = await createNumero({
        _bal: balId,
        numero: 1,
        voie: voieId,
        _deleted: new Date(),
      });

      await createNumero({
        _bal: balId,
        numero: 1,
        voie: voieId,
      });

      const response = await request(app.getHttpServer())
        .get(`/bases-locales/${balId}/all/deleted`)
        .expect(200);

      expect(response.body.toponymes).toHaveLength(1);
      expect(response.body.toponymes[0]._id).toEqual(toponymeId.toString());
      expect(response.body.voies).toHaveLength(1);
      expect(response.body.voies[0]._id).toEqual(voieId.toString());
      expect(response.body.voies[0].numeros).toHaveLength(1);
      expect(response.body.voies[0].numeros[0]._id).toEqual(
        numeroId.toString(),
      );
    });
  });
});
