import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import * as csvWriter from 'csv-write-stream';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { Numero } from '@/shared/schemas/numero/numero.schema';
import { TypeNumerotationEnum } from '@/shared/schemas/voie/type_numerotation.enum';

@Injectable()
export class ExportCsvService {
  constructor(
    @InjectModel(BaseLocale.name) private baseLocalModel: Model<BaseLocale>,
    @InjectModel(Voie.name) private voieModel: Model<Voie>,
    @InjectModel(Toponyme.name) private toponymeModel: Model<Toponyme>,
    @InjectModel(Numero.name) private numeroModel: Model<Numero>,
  ) {}

  private async exportBalsCsv() {
    const writer = csvWriter({
      headers: [
        'id',
        'nom',
        'commune',
        'emails',
        'token',
        'status',
        'habilitation',
        'sync',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
    });
    const pathFileBal = join(__dirname, '../../../csv/bases_locales.csv');
    writer.pipe(createWriteStream(pathFileBal));

    const bals = this.baseLocalModel.find({}).lean();
    for await (const bal of bals) {
      try {
        // WRITE BASES_LOCALES
        const row: any = {
          id: bal._id.toHexString(),
          nom: bal.nom,
          commune: bal.commune,
          emails: `{${bal.emails.join(',')}}`,
          token: bal.token,
          status: bal.status,
          habilitation: bal._habilitation,
          sync: bal.sync
            ? JSON.stringify({
                status: bal.sync.status,
                isPaused: bal.sync.isPaused,
                lastUploadedRevisionId: bal.sync.lastUploadedRevisionId,
                currentUpdated: bal.sync.currentUpdated?.toISOString(),
              })
            : null,
          created_at: bal._created.toISOString(),
          updated_at: bal._updated.toISOString(),
          deleted_at: bal._deleted?.toISOString(),
        };
        writer.write(row);
      } catch (e) {
        console.log(e, bal);
      }
    }

    writer.end();
  }

  private async exportVoiesCsv() {
    const writer = csvWriter({
      headers: [
        'id',
        'bal_id',
        'nom',
        'nom_alt',
        'type_numerotation',
        'centroid',
        'trace',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
    });
    const pathFile = join(__dirname, '../../../csv/voies.csv');
    writer.pipe(createWriteStream(pathFile));

    const bals = await this.baseLocalModel.find({}, { _id: 1 }).lean();
    const balIds = bals.map(({ _id }) => _id);
    const voies = this.voieModel.find({ _bal: { $in: balIds } }).lean();
    let count = 0;
    const total = await this.voieModel
      .find({ _bal: { $in: balIds } })
      .countDocuments();
    for await (const voie of voies) {
      try {
        const row = {
          id: voie._id.toHexString(),
          bal_id: voie._bal,
          nom: voie.nom,
          nom_alt: voie.nomAlt ? JSON.stringify(voie.nomAlt) : null,
          type_numerotation:
            voie.typeNumerotation || TypeNumerotationEnum.NUMERIQUE,
          centroid: voie.centroid?.geometry
            ? JSON.stringify(voie.centroid.geometry)
            : null,
          trace: voie.trace ? JSON.stringify(voie.trace) : null,
          created_at: voie._created.toISOString(),
          updated_at: voie._updated.toISOString(),
          deleted_at: voie._deleted?.toISOString(),
        };
        writer.write(row);
      } catch (e) {
        console.log(e, voie);
      }
      count++;
      if (count % 100000 === 0) {
        console.log(`${count}/${total} voies`);
      }
    }
    writer.end();
  }

  private async exportToponymesCsv() {
    const writer = csvWriter({
      headers: [
        'id',
        'bal_id',
        'nom',
        'nom_alt',
        'parcelles',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
    });
    const pathFile = join(__dirname, '../../../csv/toponymes.csv');
    writer.pipe(createWriteStream(pathFile));

    const bals = await this.baseLocalModel.find({}, { _id: 1 }).lean();
    const balIds = bals.map(({ _id }) => _id);

    const toponymes = this.toponymeModel.find({ _bal: { $in: balIds } }).lean();
    let count = 0;
    const total = await this.toponymeModel
      .find({ _bal: { $in: balIds } })
      .countDocuments();
    for await (const toponyme of toponymes) {
      try {
        const row = {
          id: toponyme._id.toHexString(),
          bal_id: toponyme._bal,
          nom: toponyme.nom,
          nom_alt: toponyme.nomAlt ? JSON.stringify(toponyme.nomAlt) : null,
          parcelles: toponyme.parcelles && `{${toponyme.parcelles.join(',')}}`,
          created_at: toponyme._created.toISOString(),
          updated_at: toponyme._updated.toISOString(),
          deleted_at: toponyme._deleted?.toISOString(),
        };
        writer.write(row);
      } catch (e) {
        console.log(e, toponyme);
      }
      count++;
      if (count % 100000 === 0) {
        console.log(`${count}/${total} toponymes`);
      }
    }
    writer.end();
  }

  private async exportNumerosCsv() {
    const writer = csvWriter({
      headers: [
        'id',
        'bal_id',
        'voie_id',
        'toponyme_id',
        'numero',
        'suffixe',
        'comment',
        'parcelles',
        'certifie',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
    });
    const pathFile = join(__dirname, '../../../csv/numeros.csv');
    writer.pipe(createWriteStream(pathFile));

    const bals = await this.baseLocalModel.find({}, { _id: 1 }).lean();
    const balIds = bals.map(({ _id }) => _id);

    const numeros = this.numeroModel.find({ _bal: { $in: balIds } }).lean();
    let count = 0;
    const total = await this.numeroModel
      .find({ _bal: { $in: balIds } })
      .countDocuments();
    for await (const numero of numeros) {
      try {
        const row = {
          id: numero._id.toHexString(),
          bal_id: numero._bal,
          voie_id: numero.voie,
          toponyme_id: numero.toponyme,
          numero: numero.numero,
          suffixe: numero.suffixe,
          comment: numero.comment,
          parcelles: numero.parcelles && `{${numero.parcelles.join(',')}}`,
          certifie: numero.certifie ? 'true' : 'false',
          created_at: numero._created.toISOString(),
          updated_at: numero._updated.toISOString(),
          deleted_at: numero._deleted?.toISOString(),
        };
        writer.write(row);
      } catch (e) {
        console.log(e, numero);
      }
      count++;
      if (count % 100000 === 0) {
        console.log(`${count}/${total} numeros`);
      }
    }
    writer.end();
  }

  private async exportPoisitionCsv() {
    const writer = csvWriter({
      headers: [
        'bal_id',
        'numero_id',
        'toponyme_id',
        'type',
        'source',
        'point',
      ],
    });
    const pathFile = join(__dirname, '../../../csv/positions.csv');
    writer.pipe(createWriteStream(pathFile));

    const bals = await this.baseLocalModel.find({}, { _id: 1 }).lean();
    const balIds = bals.map(({ _id }) => _id);

    const toponymes = this.toponymeModel.find({ _bal: { $in: balIds } }).lean();
    let count = 0;
    let total = await this.toponymeModel
      .find({ _bal: { $in: balIds } })
      .countDocuments();
    for await (const toponyme of toponymes) {
      if (toponyme.positions) {
        for (const p of toponyme.positions) {
          try {
            const row = {
              bal_id: toponyme._bal,
              toponyme_id: toponyme._id,
              type: p.type,
              source: p.source,
              point: JSON.stringify(p.point),
            };
            writer.write(row);
          } catch (e) {
            console.log(e, toponyme);
          }
        }
      }
      count++;
      if (count % 100000 === 0) {
        console.log(`${count}/${total} positions toponymes`);
      }
    }

    const numeros = this.numeroModel.find({ _bal: { $in: balIds } }).lean();
    count = 0;
    total = await this.numeroModel
      .find({ _bal: { $in: balIds } })
      .countDocuments();
    for await (const numero of numeros) {
      if (numero.positions) {
        for (const p of numero.positions) {
          try {
            const row = {
              bal_id: numero._bal,
              numero_id: numero._id,
              type: p.type,
              source: p.source,
              point: JSON.stringify(p.point),
            };
            writer.write(row);
          } catch (e) {
            console.log(e, numero);
          }
        }
      }
      count++;
      if (count % 100000 === 0) {
        console.log(`${count}/${total} positions numeros`);
      }
    }

    writer.end();
  }

  public async exportCsvs() {
    console.log('EXPORT CSV BALS');
    await this.exportBalsCsv();
    console.log('EXPORT CSV TOPONYMES');
    await this.exportToponymesCsv();
    console.log('EXPORT CSV VOIES');
    await this.exportVoiesCsv();
    console.log('EXPORT CSV NUMEROS');
    await this.exportNumerosCsv();
    console.log('EXPORT CSV POSITIONS');
    await this.exportPoisitionCsv();
    console.log('END EXPORT CSV');
  }
}
