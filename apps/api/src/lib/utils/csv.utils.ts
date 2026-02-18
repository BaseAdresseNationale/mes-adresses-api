import {
  validate,
  ValidateType,
  ValidateRowFullType,
} from '@ban-team/validateur-bal';
import { normalize } from '@ban-team/adresses-util/lib/voies';
import { chain, compact, keyBy, min, max } from 'lodash';
import { v4 as uuid } from 'uuid';

import { beautifyUppercased, beautifyNomAlt } from './string.utils';

import { PositionTypeEnum } from '@/shared/entities/position.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { ObjectId } from 'mongodb';
import { Logger } from '@/shared/utils/logger.utils';
import {
  DEFAULT_CODE_VOIE,
  DEFAULT_NUMERO_TOPONYME,
} from '@/shared/modules/export_csv/utils/export_csv_bal.utils';

export type FromCsvType = {
  isValid?: boolean;
  validationError?: string;
  accepted?: number;
  rejected?: number;
  communeNomsAlt?: Record<string, string>;
  voies?: Partial<Voie>[];
  numeros?: Partial<Numero>[];
  toponymes?: Partial<Toponyme>[];
};

export function getVoieNomLang({
  localizedValues,
}: ValidateRowFullType): string | null {
  return localizedValues.voie_nom || localizedValues.toponyme;
}

export function getVoieNom({
  parsedValues,
}: ValidateRowFullType): string | null {
  return parsedValues.voie_nom || parsedValues.toponyme;
}

export function extractIdBanAdresse({
  parsedValues,
  additionalValues,
}: ValidateRowFullType): string | null {
  return (
    parsedValues?.id_ban_adresse ||
    additionalValues?.uid_adresse?.idBanAdresse ||
    null
  );
}

export function extractIdBanToponyme({
  parsedValues,
  additionalValues,
}: ValidateRowFullType): string | null {
  return (
    parsedValues?.id_ban_toponyme ||
    additionalValues?.uid_adresse?.idBanToponyme ||
    null
  );
}

export function extractCodeCommune({
  parsedValues,
  additionalValues,
}: ValidateRowFullType): string | null {
  return (
    parsedValues.commune_insee || additionalValues?.cle_interop?.codeCommune
  );
}

export function extractCodeVoie({
  additionalValues,
}: ValidateRowFullType): string | null {
  return additionalValues?.cle_interop?.codeVoie &&
    additionalValues?.cle_interop?.codeVoie !== DEFAULT_CODE_VOIE
    ? additionalValues.cle_interop.codeVoie.toLowerCase()
    : null;
}

function extractPosition(row: any) {
  return {
    source: row.parsedValues.source || null,
    type: row.parsedValues.position || PositionTypeEnum.ENTREE,
    point: {
      type: 'Point',
      coordinates: [row.parsedValues.long, row.parsedValues.lat],
    },
  };
}

function extractPositions(rows: any) {
  return rows
    .filter((r) => r.parsedValues.long && r.parsedValues.lat)
    .map((r) => extractPosition(r));
}

function extractDate(row: any) {
  if (row.parsedValues.date_der_maj) {
    return new Date(row.parsedValues.date_der_maj);
  }
}

function extractToponymes(rows: ValidateRowFullType[]): Partial<Toponyme>[] {
  return chain(rows)
    .filter((r) => r.parsedValues.numero === DEFAULT_NUMERO_TOPONYME)
    .groupBy((r) => normalize(getVoieNom(r)))
    .map((toponymeRows) => {
      const date = extractDate(toponymeRows[0]) || new Date();
      const voieNomLang = getVoieNomLang(toponymeRows[0]);
      return {
        id: new ObjectId().toHexString(),
        banId: extractIdBanToponyme(toponymeRows[0]),
        nom: beautifyUppercased(getVoieNom(toponymeRows[0])),
        nomAlt: voieNomLang ? beautifyNomAlt(voieNomLang) : null,
        positions: extractPositions(toponymeRows),
        communeDeleguee:
          toponymeRows[0].rawValues.commune_deleguee_insee || null,
        codeVoie: extractCodeVoie(toponymeRows[0]),
        createdAt: date,
        updatedAt: date,
      };
    })
    .value();
}

function extractVoies(rows: ValidateRowFullType[]): Partial<Voie>[] {
  return chain(rows)
    .filter((r) => r.parsedValues.numero !== DEFAULT_NUMERO_TOPONYME)
    .groupBy((r) => normalize(getVoieNom(r)))
    .map((voieRows) => {
      const dates = compact(voieRows.map((r) => r.parsedValues.date_der_maj));
      const voieNomLang = getVoieNomLang(voieRows[0]);
      return {
        id: new ObjectId().toHexString(),
        banId: extractIdBanToponyme(voieRows[0]),
        nom: beautifyUppercased(getVoieNom(voieRows[0])),
        nomAlt: voieNomLang ? beautifyNomAlt(voieNomLang) : null,
        codeVoie: extractCodeVoie(voieRows[0]),
        createdAt: dates.length > 0 ? new Date(min(dates)) : new Date(),
        updatedAt: dates.length > 0 ? new Date(max(dates)) : new Date(),
      };
    })
    .value();
}

function extractNumeros(
  rows: ValidateRowFullType[],
  toponymes: Partial<Toponyme>[],
  toponymesIndex: Record<string, Partial<Toponyme>>,
  voiesIndex: Record<string, Partial<Voie>>,
): Partial<Numero>[] {
  return chain(rows)
    .filter((r) => r.parsedValues.numero !== DEFAULT_NUMERO_TOPONYME)
    .groupBy(
      (r: ValidateRowFullType) =>
        `${r.parsedValues.numero}@@@${r.parsedValues.suffixe}@@@${normalize(
          getVoieNom(r),
        )}`,
    )
    .map((numeroRows: ValidateRowFullType[]) => {
      const date = extractDate(numeroRows[0]) || new Date();

      const voieString = normalize(getVoieNom(numeroRows[0]));
      const toponymeString = numeroRows[0].parsedValues.lieudit_complement_nom
        ? normalize(numeroRows[0].parsedValues.lieudit_complement_nom)
        : null;
      const toponymeAlt = numeroRows[0].localizedValues.lieudit_complement_nom
        ? beautifyNomAlt(numeroRows[0].localizedValues.lieudit_complement_nom)
        : null;

      if (toponymeString && !(toponymeString in toponymesIndex)) {
        const toponyme: Partial<Toponyme> = {
          id: new ObjectId().toHexString(),
          banId: uuid(),
          nom: beautifyUppercased(
            numeroRows[0].parsedValues.lieudit_complement_nom,
          ),
          nomAlt: toponymeAlt,
          positions: [],
          parcelles: numeroRows[0].parsedValues.cad_parcelles as string[],
          communeDeleguee:
            numeroRows[0].rawValues.commune_deleguee_insee || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        toponymes.push(toponyme);
        toponymesIndex[toponymeString] = toponyme;
      }

      return {
        id: new ObjectId().toHexString(),
        banId: extractIdBanAdresse(numeroRows[0]),
        voieId: voiesIndex[voieString].id,
        toponymeId: toponymeString ? toponymesIndex[toponymeString].id : null,
        numero: numeroRows[0].parsedValues.numero,
        suffixe: numeroRows[0].parsedValues.suffixe || null,
        certifie: numeroRows[0].parsedValues.certification_commune,
        positions: extractPositions(numeroRows),
        parcelles: numeroRows[0].parsedValues.cad_parcelles,
        communeDeleguee: numeroRows[0].parsedValues.commune_deleguee_insee,
        createdAt: date,
        updatedAt: date,
      };
    })
    .value();
}

function extractData(rows: ValidateRowFullType[]): {
  voies: Partial<Voie>[];
  numeros: Partial<Numero>[];
  toponymes: Partial<Toponyme>[];
} {
  const toponymes: Partial<Toponyme>[] = extractToponymes(rows);
  const toponymesIndex: Record<string, Partial<Toponyme>> = keyBy(
    toponymes,
    (t) => normalize(t.nom),
  );

  const voies: Partial<Voie>[] = extractVoies(rows);
  const voiesIndex: Record<string, Partial<Voie>> = keyBy(voies, (v) =>
    normalize(v.nom),
  );

  const numeros: Partial<Numero>[] = extractNumeros(
    rows,
    toponymes,
    toponymesIndex,
    voiesIndex,
  );

  return { voies, numeros, toponymes };
}

export async function extractFromCsv(
  file: Buffer,
  codeCommune: string,
): Promise<FromCsvType> {
  try {
    const { rows, parseOk } = (await validate(file, {
      profile: '1.3-relax',
    })) as ValidateType;
    if (!parseOk) {
      return { isValid: false };
    }

    const accepted: ValidateRowFullType[] = rows.filter(
      ({ isValid }) => isValid,
    );
    const rejected: ValidateRowFullType[] = rows.filter(
      ({ isValid }) => !isValid,
    );
    const communesData = extractData(
      accepted.filter((r) => extractCodeCommune(r) === codeCommune),
    );

    const communeNomsAlt =
      rows.find((row) => row.localizedValues?.commune_nom)?.localizedValues
        ?.commune_nom || null;
    return {
      isValid: true,
      accepted: accepted.length,
      rejected: rejected.length,
      communeNomsAlt,
      voies: communesData.voies,
      numeros: communesData.numeros,
      toponymes: communesData.toponymes,
    };
  } catch (error) {
    Logger.error(
      `Impossible d'extraire la BAL sur CSV`,
      error,
      extractFromCsv.name,
    );
    return { isValid: false, validationError: error.message };
  }
}
