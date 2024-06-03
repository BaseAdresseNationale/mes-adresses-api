import { validate } from '@ban-team/validateur-bal';
import { normalize } from '@ban-team/adresses-util/lib/voies';
import { chain, compact, keyBy, min, max } from 'lodash';

import { beautifyUppercased, beautifyNomAlt } from './string.utils';
import { ObjectId } from 'mongodb';
import { PositionTypeEnum } from '@/shared/schemas/position_type.enum';
import { Position } from '@/shared/schemas/position.schema';

interface Row {
  parsedValues: Record<string, any>;
  additionalValues: any;
  localizedValues: any;
  isValid: boolean;
}

export function extractIdBanAdresse({
  parsedValues,
  additionalValues,
}: Row): string | null {
  return (
    parsedValues?.id_ban_adresse ||
    additionalValues?.uid_adresse?.idBanAdresse ||
    null
  );
}

export function extractIdBanToponyme({
  parsedValues,
  additionalValues,
}: Row): string | null {
  return (
    parsedValues?.id_ban_toponyme ||
    additionalValues?.uid_adresse?.idBanToponyme ||
    null
  );
}

export function extractCodeCommune({
  parsedValues,
  additionalValues,
}: Row): string | null {
  return (
    parsedValues.commune_insee || additionalValues?.cle_interop?.codeCommune
  );
}

export function extractPosition(row: Row): Position {
  return {
    source: row.parsedValues.source || null,
    type: row.parsedValues.position || PositionTypeEnum.INCONNUE,
    point: {
      type: 'Point',
      coordinates: [row.parsedValues.long, row.parsedValues.lat],
    },
  };
}

export function extractPositions(rows: Row[]): Position[] {
  return rows
    .filter((r) => r.parsedValues.long && r.parsedValues.lat)
    .map((r) => extractPosition(r));
}

export function extractDate(row: Row): Date | null {
  if (row.parsedValues.date_der_maj) {
    return new Date(row.parsedValues.date_der_maj);
  }
}

export function extractData(rows: Row[], codeCommune: string) {
  const toponymes = chain(rows)
    .filter((r: Row) => r.parsedValues.numero === 99999)
    .groupBy((r: Row) => normalize(r.parsedValues.voie_nom))
    .map((toponymeRows: Row[]) => {
      const date = extractDate(toponymeRows[0]) || new Date();

      return {
        _id: new ObjectId(),
        banId: extractIdBanToponyme(toponymeRows[0]),
        commune: codeCommune,
        nom: beautifyUppercased(toponymeRows[0].parsedValues.voie_nom),
        nomAlt: toponymeRows[0].localizedValues.voie_nom
          ? beautifyNomAlt(toponymeRows[0].localizedValues.voie_nom)
          : null,
        positions: extractPositions(toponymeRows),
        _created: date,
        _updated: date,
      };
    })
    .value();

  const toponymesIndex = keyBy(toponymes, (t) => normalize(t.nom));

  const voies = chain(rows)
    .filter((r: Row) => r.parsedValues.numero !== 99999)
    .groupBy((r: Row) => normalize(r.parsedValues.voie_nom))
    .map((voieRows: Row[]) => {
      const dates = compact(voieRows.map((r) => r.parsedValues.date_der_maj));

      return {
        _id: new ObjectId(),
        banId: extractIdBanToponyme(voieRows[0]),
        commune: codeCommune,
        nom: beautifyUppercased(voieRows[0].parsedValues.voie_nom),
        nomAlt: voieRows[0].localizedValues.voie_nom
          ? beautifyNomAlt(voieRows[0].localizedValues.voie_nom)
          : null,
        _created: dates.length > 0 ? new Date(min(dates)) : new Date(),
        _updated: dates.length > 0 ? new Date(max(dates)) : new Date(),
      };
    })
    .value();

  const voiesIndex = keyBy(voies, (v) => normalize(v.nom));

  const numeros = chain(rows)
    .filter((r: Row) => r.parsedValues.numero !== 99999)
    .groupBy(
      (r: Row) =>
        `${r.parsedValues.numero}@@@${r.parsedValues.suffixe}@@@${normalize(
          r.parsedValues.voie_nom,
        )}`,
    )
    .map((numeroRows: Row[]) => {
      const date = extractDate(numeroRows[0]) || new Date();

      const voieString = normalize(numeroRows[0].parsedValues.voie_nom);
      const toponymeString = numeroRows[0].parsedValues.lieudit_complement_nom
        ? normalize(numeroRows[0].parsedValues.lieudit_complement_nom)
        : null;
      const toponymeAlt = numeroRows[0].localizedValues.lieudit_complement_nom
        ? beautifyNomAlt(numeroRows[0].localizedValues.lieudit_complement_nom)
        : null;

      if (toponymeString && !(toponymeString in toponymesIndex)) {
        const toponyme = {
          _id: new ObjectId(),
          banId: extractIdBanToponyme(numeroRows[0]),
          commune: codeCommune,
          nom: beautifyUppercased(
            numeroRows[0].parsedValues.lieudit_complement_nom,
          ),
          nomAlt: toponymeAlt,
          positions: [],
          parcelles: numeroRows[0].parsedValues.cad_parcelles,
          _created: new Date(),
          _updated: new Date(),
        };

        toponymes.push(toponyme);
        toponymesIndex[toponymeString] = toponyme;
      }

      return {
        _id: new ObjectId(),
        banId: extractIdBanAdresse(numeroRows[0]),
        commune: codeCommune,
        voie: voiesIndex[voieString]._id,
        toponyme: toponymeString ? toponymesIndex[toponymeString]._id : null,
        numero: numeroRows[0].parsedValues.numero,
        suffixe: numeroRows[0].parsedValues.suffixe || null,
        certifie: numeroRows[0].parsedValues.certification_commune,
        positions: extractPositions(numeroRows),
        parcelles: numeroRows[0].parsedValues.cad_parcelles,
        _created: date,
        _updated: date,
      };
    })
    .value();

  return { voies, numeros, toponymes };
}

export async function extractFromCsv(file: Buffer, codeCommune: string) {
  try {
    const {
      rows,
      parseOk,
    }: {
      rows: Row[];
      parseOk: boolean;
    } = await validate(file, { profile: '1.4-relax' });

    if (!parseOk) {
      return { isValid: false };
    }

    const accepted: Row[] = rows.filter(({ isValid }) => isValid);
    const rejected: Row[] = rows.filter(({ isValid }) => !isValid);

    const communesData = extractData(
      accepted.filter((r: Row) => extractCodeCommune(r) === codeCommune),
      codeCommune,
    );

    return {
      isValid: true,
      accepted: accepted.length,
      rejected: rejected.length,
      voies: communesData.voies,
      numeros: communesData.numeros,
      toponymes: communesData.toponymes,
    };
  } catch (error) {
    console.log(error);
    return { isValid: false, validationError: error.message };
  }
}
