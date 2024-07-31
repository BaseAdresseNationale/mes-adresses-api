import * as csvWriter from 'csv-write-stream';
import * as getStream from 'get-stream';
import * as intoStream from 'into-stream';
import * as pumpify from 'pumpify';

import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';

type CsvRow = {
  type: string;
  nom: string;
  nombre_de_numeros?: number;
  numeros?: string;
};

function createHeader(rows: CsvRow[]): string[] {
  const headers = new Set<string>();

  for (const row of rows) {
    for (const header of Object.keys(row)) {
      headers.add(header);
    }
  }

  return [...headers];
}

function createKeysNomAlts(
  models: Array<Voie | Toponyme>,
): Record<string, string> {
  const keysNomAlts: Record<string, string> = {};

  for (const model of models) {
    if (model.nomAlt) {
      Object.keys(model.nomAlt).forEach((o) => {
        keysNomAlts[o] = `nom_alt_${o}`;
      });
    }
  }

  return keysNomAlts;
}

function modelToRow(
  type: 'voieId' | 'toponymeId',
  model: Voie | Toponyme,
  numeros: Numero[],
  keysNomAlts: Record<string, string>,
) {
  const numerosVoie: Numero[] = numeros.filter((n) => model.id === n[type]);

  const row: CsvRow = {
    type: type === 'voieId' ? 'voie' : 'toponyme',
    nom: model.nom || '',
  };

  row.nombre_de_numeros = numerosVoie.length; // eslint-disable-line camelcase
  row.numeros =
    numerosVoie.length > 0
      ? numerosVoie.map((n) => String(n.numero) + (n.suffixe || '')).join(' ')
      : '';

  for (const key in keysNomAlts) {
    if (Object.hasOwnProperty.call(keysNomAlts, key)) {
      row[keysNomAlts[key]] = model?.nomAlt?.[key] || null;
    }
  }

  return row;
}

export function exportVoiesToCsv(
  voies: Voie[],
  toponymes: Toponyme[],
  numeros: Numero[],
): Promise<string> {
  const keysNomAlts: Record<string, string> = createKeysNomAlts([
    ...voies,
    ...toponymes,
  ]);
  const rows: CsvRow[] = [
    ...voies.map((v) => modelToRow('voieId', v, numeros, keysNomAlts)),
    ...toponymes.map((t) => modelToRow('toponymeId', t, numeros, keysNomAlts)),
  ];
  const header: string[] = createHeader(rows);

  return getStream(
    pumpify.obj(
      intoStream.object(rows),
      csvWriter({ separator: ';', newline: '\r\n', header }),
    ),
  );
}
