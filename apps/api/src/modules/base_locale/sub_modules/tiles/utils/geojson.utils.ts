import * as turf from '@turf/turf';
import { Feature as FeatureTurf } from '@turf/helpers';
import { FeatureCollection } from 'geojson';

import { Voie } from '@/shared/entities/voie.entity';

import { GeoJsonCollectionType } from '@/modules/base_locale/sub_modules/tiles/types/features.type';
import { NumeroInBbox } from '@/lib/types/numero.type';
import { ToponymeInBox } from '@/lib/types/toponyme.type';

// Paul Tol's vibrant palette for accessibility
const colorblindFriendlyPalette = [
  '#EE7733',
  '#0077BB',
  '#33BBEE',
  '#EE3377',
  '#CC3311',
  '#009988',
];

const neutralColor = '#c1c4d6';

function getFeatureColor(id?: string): string {
  if (!id) {
    return neutralColor;
  }

  const slicedId = id.slice(16).replace(/-/g, '');
  return colorblindFriendlyPalette[
    Number.parseInt(slicedId, 16) % colorblindFriendlyPalette.length
  ];
}

function numeroToPointFeature(n: NumeroInBbox): FeatureTurf {
  return turf.feature(n.point, {
    id: n.id,
    numero: n.numero,
    suffixe: n.suffixe,
    parcelles: n.parcelles,
    certifie: n.certifie,
    idVoie: n.voieId,
    idToponyme: n.toponymeId,
    color: getFeatureColor(n.voieId),
    colorToponyme: getFeatureColor(n.toponymeId),
  });
}

function voieToLineStringFeature(v: Voie): FeatureTurf {
  return turf.feature(v.trace, {
    id: v.id,
    nom: v.nom,
    originalGeometry: v.trace,
    color: getFeatureColor(v.id),
  });
}

function voieToPointFeature(v: Voie): FeatureTurf {
  return turf.feature(v.centroid, {
    id: v.id,
    nom: v.nom,
    color: getFeatureColor(v.id),
  });
}

export function voiesPointsToGeoJSON(voies: Voie[]): FeatureCollection {
  return turf.featureCollection(
    voies.map((n) => voieToPointFeature(n)),
  ) as FeatureCollection;
}

function toponymeToPointFeature(t: ToponymeInBox): FeatureTurf {
  return turf.feature(t.point, {
    id: t.id,
    nom: t.nom,
    color: getFeatureColor(t.id),
  });
}

export function toponymesPointsToGeoJSON(
  toponymes: ToponymeInBox[],
): FeatureCollection {
  return turf.featureCollection(
    toponymes.map((n) => toponymeToPointFeature(n)),
  ) as FeatureCollection;
}

export function voiesLineStringsToGeoJSON(voies: Voie[]): FeatureCollection {
  return turf.featureCollection(
    voies.map((n) => voieToLineStringFeature(n)),
  ) as FeatureCollection;
}

export function numerosPointsToGeoJSON(
  numeros: NumeroInBbox[],
): FeatureCollection {
  return turf.featureCollection(
    numeros.map((n) => numeroToPointFeature(n)),
  ) as FeatureCollection;
}

export function getGeoJson(
  voies: Voie[],
  traces: Voie[],
  numeros: NumeroInBbox[],
  toponymes: ToponymeInBox[],
): GeoJsonCollectionType {
  return {
    numeroPoints: numerosPointsToGeoJSON(numeros),
    voiePoints: voiesPointsToGeoJSON(voies),
    voieLineStrings: voiesLineStringsToGeoJSON(traces),
    toponymePoints: toponymesPointsToGeoJSON(toponymes),
  };
}
