import * as turf from '@turf/turf';
import { Feature as FeatureTurf } from '@turf/helpers';
import * as randomColor from 'randomcolor';
import { FeatureCollection } from 'geojson';

import { Numero } from '@/shared/entities/numero.entity';
import { Voie } from '@/shared/entities/voie.entity';

import { getPriorityPosition } from '@/lib/utils/positions.util';
import { GeoJsonCollectionType } from '@/modules/base_locale/sub_modules/tiles/types/features.type';

// Paul Tol's vibrant palette for accessibility
const colorblindFriendlyHues = [
  '#EE7733',
  '#0077BB',
  '#33BBEE',
  '#EE3377',
  '#CC3311',
  '#009988',
];

function getColorById(id: string): string {
  return randomColor({
    luminosity: 'dark',
    seed: id,
  });
}

// Returns a color of the palette based on the bal ID
function getColorblindFriendlyHue(id: string): string {
  const slicedId = id.slice(16).replace(/-/g, '');
  return colorblindFriendlyHues[
    Number.parseInt(slicedId, 16) % colorblindFriendlyHues.length
  ];
}

function getFeatureColor(id: string, colorblindMode: boolean = false): string {
  return colorblindMode ? getColorblindFriendlyHue(id) : getColorById(id);
}

function numeroToPointFeature(n: Numero, colorblindMode: boolean): FeatureTurf {
  const position = getPriorityPosition(n.positions);
  return turf.feature(position.point, {
    type: 'adresse',
    id: n.id,
    numero: n.numero,
    suffixe: n.suffixe,
    typePosition: position.type,
    parcelles: n.parcelles,
    certifie: n.certifie,
    idVoie: n.voieId,
    idToponyme: n.toponymeId,
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
  numeros: Numero[],
  colorblindMode: boolean,
): FeatureCollection {
  return turf.featureCollection(
    numeros.map((n) => numeroToPointFeature(n, colorblindMode)),
  ) as FeatureCollection;
}

export function getGeoJson(
  voies: Voie[],
  traces: Voie[],
  numeros: Numero[],
  colorblindMode: boolean,
): GeoJsonCollectionType {
  return {
    numeroPoints: numerosPointsToGeoJSON(numeros, colorblindMode),
    voiePoints: voiesPointsToGeoJSON(voies, colorblindMode),
    voieLineStrings: voiesLineStringsToGeoJSON(traces, colorblindMode),
  };
}
