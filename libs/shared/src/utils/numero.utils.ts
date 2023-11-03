import { Numero } from '../schemas/numero/numero.schema';
import { NumeroPopulate } from '../schemas/numero/numero.populate';
import { WithNumero } from '../types/with-numero.type';
import { Position } from '@/shared/schemas/position.schema';
import * as turf from '@turf/turf';
import bbox from '@turf/bbox';
import { Feature as FeatureTurf } from '@turf/helpers';
import { TypeNumerotationEnum } from '../schemas/voie/type_numerotation.enum';
import { Voie } from '../schemas/voie/voie.schema';
import { Toponyme } from '../schemas/toponyme/toponyme.schema';

export function displaySuffix(numero: Numero): string {
  if (numero.suffixe) {
    if (numero.suffixe.trim().match(/^\d/)) {
      return '-' + numero.suffixe.trim();
    }
    return numero.suffixe.trim();
  }

  return '';
}

export function filterSensitiveFields(
  numero: Numero | NumeroPopulate,
  filter: boolean = true,
): Numero | NumeroPopulate {
  if (filter && numero.comment) {
    numero.comment = null;
  }
  return numero;
}

export function normalizeSuffixe(suffixe: string): string {
  return suffixe.toLowerCase().trim();
}

export function extendWithNumeros<T>(
  entity: T,
  numeros: Numero[],
  withPosition?: 'voie' | 'toponyme',
): WithNumero<T> {
  const nbNumerosCertifies = numeros.filter((n) => n.certifie === true).length;

  const extendedEntity = {
    ...(entity as any).toObject(),
    nbNumeros: numeros.length,
    nbNumerosCertifies: nbNumerosCertifies,
    isAllCertified: numeros.length > 0 && numeros.length === nbNumerosCertifies,
    commentedNumeros: numeros.filter(
      (n) => n.comment !== undefined && n.comment !== null && n.comment !== '',
    ),
  } as WithNumero<T>;

  if (withPosition === 'voie') {
    const allPositions: Position[] = numeros
      .filter((n) => n.positions && n.positions.length > 0)
      .reduce((acc, n) => [...acc, ...n.positions], []);

    if (allPositions.length > 0) {
      const features: FeatureTurf[] = allPositions.map(({ point }) =>
        turf.feature(point),
      );
      const featuresCollection = turf.featureCollection(features);
      extendedEntity.bbox = bbox(featuresCollection);
    } else if (
      (entity as Voie).trace &&
      (entity as Voie).typeNumerotation === TypeNumerotationEnum.NUMERIQUE
    ) {
      extendedEntity.bbox = bbox((entity as Voie).trace);
    }
  } else if (withPosition === 'toponyme') {
    const allPositions: Position[] = numeros
      .filter((n) => n.positions && n.positions.length > 0)
      .reduce((acc, n) => [...acc, ...n.positions], []);

    if (allPositions.length > 0) {
      const features: FeatureTurf[] = allPositions.map(({ point }) =>
        turf.feature(point),
      );
      const featuresCollection = turf.featureCollection(features);
      extendedEntity.bbox = bbox(featuresCollection);
    } else if (
      (entity as Toponyme).positions &&
      (entity as Toponyme).positions.length > 0
    ) {
      const features: FeatureTurf[] = (entity as Toponyme).positions.map(
        ({ point }) => turf.feature(point),
      );
      const featuresCollection = turf.featureCollection(features);
      extendedEntity.bbox = bbox(featuresCollection);
    }
  }

  return extendedEntity;
}
