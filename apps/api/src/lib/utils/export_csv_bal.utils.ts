import * as csvWriter from 'csv-write-stream';
import * as getStream from 'get-stream';
import * as intoStream from 'into-stream';
import { keyBy } from 'lodash';
import * as pumpify from 'pumpify';
import * as proj from '@etalab/project-legal';

import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { Numero } from '@/shared/schemas/numero/numero.schema';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { getCommune } from '@/shared/utils/cog.utils';
import { roundCoordinate } from './coor.utils';

const DEFAULT_CODE_VOIE = 'xxxx';
const DEFAULT_NUMERO_TOPONYME = 99999;
const DEFAULT_SOURCE = 'commune';

type RowType = {
  codeCommune: string;
  codeVoie: string;
  numero: number;
  suffixe?: string;
  certifie?: boolean;
  nomVoie: string;
  nomVoieAlt: Record<string, string>;
  nomToponyme?: string;
  nomToponymeAlt?: Record<string, string>;
  parcelles: string[];
  position?: any;
  _updated: Date;
};

type CsvRowType = {
  cle_interop: string;
  uid_adresse: string;
  voie_nom: string;
  lieudit_complement_nom: string;
  numero: string;
  suffixe: string;
  certification_commune: string;
  commune_insee: string;
  commune_nom: string;
  position: string;
  long: string;
  lat: string;
  x: string;
  y: string;
  cad_parcelles: string;
  source: string;
  date_der_maj: string;
};

function formatCleInterop(
  codeCommune: string,
  codeVoie: string,
  numero: number,
  suffixe: string,
): string {
  const str = `${codeCommune}_${codeVoie}_${numero
    .toString()
    .padStart(5, '0')}`;
  if (!suffixe) {
    return str.toLowerCase();
  }

  return (str + '_' + suffixe).toLowerCase();
}

// Convertie "certifie" en booleen CSV (0 ou 1)
// Gère les valeurs undefined comme cela peut être le cas pour les toponyme
function toCsvBoolean(certifie: boolean): string {
  if (certifie === undefined || certifie === null) {
    return '';
  }

  return certifie ? '1' : '0';
}

function extractHeaders(csvRows: CsvRowType[]): string[] {
  const headers = new Set<string>();

  for (const row of csvRows) {
    for (const header of Object.keys(row)) {
      headers.add(header);
    }
  }

  return [...headers];
}

/* eslint camelcase: off */
function createRow(obj: RowType): CsvRowType {
  const row: CsvRowType = {
    cle_interop: formatCleInterop(
      obj.codeCommune,
      obj.codeVoie,
      obj.numero,
      obj.suffixe,
    ),
    uid_adresse: '',
    voie_nom: obj.nomVoie,
    lieudit_complement_nom: obj.nomToponyme || '',
    numero: Number.isInteger(obj.numero) ? obj.numero.toString() : '',
    suffixe: obj.suffixe || '',
    certification_commune: toCsvBoolean(obj.certifie),
    commune_insee: obj.codeCommune,
    commune_nom: getCommune(obj.codeCommune).nom,
    position: '',
    long: '',
    lat: '',
    x: '',
    y: '',
    cad_parcelles: obj.parcelles ? obj.parcelles.join('|') : '',
    source: DEFAULT_SOURCE,
    date_der_maj: obj._updated ? obj._updated.toISOString().slice(0, 10) : '',
  };

  if (obj.nomVoieAlt) {
    Object.keys(obj.nomVoieAlt).forEach((o) => {
      row['voie_nom_' + o] = obj.nomVoieAlt[o];
    });
  }

  if (obj.nomToponymeAlt) {
    Object.keys(obj.nomToponymeAlt).forEach((o) => {
      row['lieudit_complement_nom_' + o] = obj.nomToponymeAlt[o];
    });
  }

  if (obj.position) {
    const coordsPosition = obj.position.point.coordinates;
    const projectedCoords = proj(coordsPosition);
    row.position = obj.position.type;
    row.source = obj.position.source || DEFAULT_SOURCE;
    row.long = roundCoordinate(coordsPosition[0], 6).toString();
    row.lat = roundCoordinate(coordsPosition[1], 6).toString();
    if (projectedCoords) {
      row.x = projectedCoords[0].toString();
      row.y = projectedCoords[1].toString();
    }
  }

  return row;
}

export async function exportBalToCsv(
  voies: Voie[],
  toponymes: Toponyme[],
  numeros: Numero[],
): Promise<string> {
  const voiesIndex: Record<string, Voie> = keyBy(voies, (v) =>
    v._id.toHexString(),
  );
  const rows: RowType[] = [];
  numeros.forEach((n) => {
    const voieId: string = n.voie.toHexString();
    const v: Voie = voiesIndex[voieId];

    let toponyme: Toponyme = null;

    if (n.toponyme) {
      toponyme = toponymes.find(({ _id }) => _id.equals(n.toponyme));

      if (!toponyme) {
        throw new Error(
          `Toponyme ${n.toponyme} introuvable dans la base de données`,
        );
      }
    }

    if (n.positions && n.positions.length > 0) {
      n.positions.forEach((p) => {
        rows.push({
          codeCommune: n.commune,
          codeVoie: DEFAULT_CODE_VOIE,
          numero: n.numero,
          suffixe: n.suffixe,
          certifie: n.certifie || false,
          _updated: n._updated,
          nomVoie: v.nom,
          nomVoieAlt: v.nomAlt || null,
          nomToponyme: toponyme?.nom || null,
          nomToponymeAlt: toponyme?.nomAlt || null,
          parcelles: n.parcelles,
          position: p,
        });
      });
    }
  });

  toponymes.forEach((t) => {
    if (t.positions.length > 0) {
      t.positions.forEach((p) => {
        rows.push({
          codeCommune: t.commune,
          codeVoie: DEFAULT_CODE_VOIE,
          numero: DEFAULT_NUMERO_TOPONYME,
          _updated: t._updated,
          nomVoie: t.nom,
          nomVoieAlt: t.nomAlt || null,
          parcelles: t.parcelles,
          position: p,
        });
      });
    } else {
      rows.push({
        codeCommune: t.commune,
        codeVoie: DEFAULT_CODE_VOIE,
        numero: DEFAULT_NUMERO_TOPONYME,
        _updated: t._updated,
        nomVoie: t.nom,
        nomVoieAlt: t.nomAlt || null,
        parcelles: t.parcelles,
      });
    }
  });

  const csvRows: CsvRowType[] = rows.map((row) => createRow(row));
  const headers: string[] = extractHeaders(csvRows);

  return getStream(
    pumpify.obj(
      intoStream.object(csvRows),
      csvWriter({ separator: ';', newline: '\r\n', headers }),
    ),
  );
}
