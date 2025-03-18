import * as turf from '@turf/turf';
import { Feature as FeatureTurf } from '@turf/helpers';
import { FeatureCollection } from 'geojson';

import { Voie } from '@/shared/entities/voie.entity';

import { GeoJsonCollectionType } from '@/modules/base_locale/sub_modules/tiles/types/features.type';
import { NumeroInBbox } from '@/modules/numeros/numero.service';

// Paul Tol's vibrant palette for accessibility
const colorblindFriendlyPalette = [
  '#EE7733',
  '#0077BB',
  '#33BBEE',
  '#EE3377',
  '#CC3311',
  '#009988',
];

const colorPalette = [
  '#8B1A1A',
  '#1874CD',
  '#00875A',
  '#E6C200',
  '#805BA5',
  '#D47300',
  '#36B3B3',
  '#D1127A',
];

function getFeatureColor(id: string, colorblindMode: boolean = false): string {
  const slicedId = id.slice(16).replace(/-/g, '');
  if (colorblindMode) {
    return colorblindFriendlyPalette[
      Number.parseInt(slicedId, 16) % colorblindFriendlyPalette.length
    ];
  }
  return colorPalette[Number.parseInt(slicedId, 16) % colorPalette.length];
}

function numeroToPointFeature(
  n: NumeroInBbox,
  colorblindMode: boolean,
): FeatureTurf {
  // const position = getPriorityPosition(n.positions);
  return turf.feature(n.point, {
    type: 'adresse',
    id: n.id,
    numero: n.numero,
    suffixe: n.suffixe,
    parcelles: n.parcelles,
    certifie: n.certifie,
    idVoie: n.voieId,
    color: getFeatureColor(n.voieId, colorblindMode),
  });
}

function voieToLineStringFeature(
  v: Voie,
  colorblindMode: boolean,
): FeatureTurf {
  return turf.feature(v.trace, {
    id: v.id,
    type: 'voie-trace',
    nom: v.nom,
    originalGeometry: v.trace,
    color: getFeatureColor(v.id, colorblindMode),
  });
}

function voieToPointFeature(v: Voie, colorblindMode: boolean): FeatureTurf {
  return turf.feature(v.centroid, {
    id: v.id,
    type: 'voie',
    nom: v.nom,
    color: getFeatureColor(v.id, colorblindMode),
  });
}

export function voiesPointsToGeoJSON(
  voies: Voie[],
  colorblindMode: boolean,
): FeatureCollection {
  return turf.featureCollection(
    voies.map((n) => voieToPointFeature(n, colorblindMode)),
  ) as FeatureCollection;
}

export function voiesLineStringsToGeoJSON(
  voies: Voie[],
  colorblindMode: boolean,
): FeatureCollection {
  return turf.featureCollection(
    voies.map((n) => voieToLineStringFeature(n, colorblindMode)),
  ) as FeatureCollection;
}

export function numerosPointsToGeoJSON(
  numeros: NumeroInBbox[],
  colorblindMode: boolean,
): FeatureCollection {
  return turf.featureCollection(
    numeros.map((n) => numeroToPointFeature(n, colorblindMode)),
  ) as FeatureCollection;
}

export function getGeoJson(
  voies: Voie[],
  traces: Voie[],
  numeros: NumeroInBbox[],
  colorblindMode: boolean,
): GeoJsonCollectionType {
  return {
    numeroPoints: numerosPointsToGeoJSON(numeros, colorblindMode),
    voiePoints: voiesPointsToGeoJSON(voies, colorblindMode),
    voieLineStrings: voiesLineStringsToGeoJSON(traces, colorblindMode),
  };
}
