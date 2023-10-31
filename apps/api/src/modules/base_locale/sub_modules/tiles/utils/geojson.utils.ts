import * as turf from '@turf/turf';
import { Feature as FeatureTurf } from '@turf/helpers';
import * as randomColor from 'randomcolor';
import { Types } from 'mongoose';
import { FeatureCollection } from 'geojson';

import { Numero } from '@/shared/schemas/numero/numero.schema';
import { Voie } from '@/shared/schemas/voie/voie.schema';

import { getPriorityPosition } from '@/lib/utils/positions.util';
import {
  ModelsInTileType,
  GeoJsonCollectionType,
} from '@/modules/base_locale/sub_modules/tiles/types/features.type';

// Paul Tol's vibrant palette for accessibility
const colorblindFriendlyHues = [
  '#EE7733',
  '#0077BB',
  '#33BBEE',
  '#EE3377',
  '#CC3311',
  '#009988',
];

function getColorById(id: Types.ObjectId): string {
  return randomColor({
    luminosity: 'dark',
    seed: id.toHexString(),
  });
}

// Returns a color of the palette based on the bal ID
function getColorblindFriendlyHue(id: Types.ObjectId): string {
  const slicedId = id.toHexString().slice(19);

  return colorblindFriendlyHues[
    Number.parseInt(slicedId, 16) % colorblindFriendlyHues.length
  ];
}

function getFeatureColor(
  id: Types.ObjectId,
  colorblindMode: boolean = false,
): string {
  return colorblindMode ? getColorblindFriendlyHue(id) : getColorById(id);
}

function numeroToPointFeature(n: Numero, colorblindMode: boolean): FeatureTurf {
  const position = getPriorityPosition(n.positions);
  return turf.feature(position.point, {
    type: 'adresse',
    id: n._id.toHexString(),
    numero: n.numero,
    suffixe: n.suffixe,
    typePosition: position.type,
    parcelles: n.parcelles,
    certifie: n.certifie,
    idVoie: n.voie.toHexString(),
    idToponyme: n.toponyme ? n.toponyme.toHexString() : null,
    color: getFeatureColor(n.voie, colorblindMode),
  });
}

function voieToLineStringFeature(
  v: Voie,
  colorblindMode: boolean,
): FeatureTurf {
  return turf.feature(v.trace, {
    id: v._id.toHexString(),
    type: 'voie-trace',
    nom: v.nom,
    originalGeometry: v.trace,
    color: getFeatureColor(v._id, colorblindMode),
  });
}

function voieToPointFeature(v: Voie, colorblindMode: boolean): FeatureTurf {
  return turf.feature(v.centroid.geometry, {
    id: v._id.toHexString(),
    type: 'voie',
    nom: v.nom,
    color: getFeatureColor(v._id, colorblindMode),
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
  modelsInTile: ModelsInTileType,
  colorblindMode: boolean,
): GeoJsonCollectionType {
  return {
    numeroPoints: numerosPointsToGeoJSON(modelsInTile.numeros, colorblindMode),
    voiePoints: voiesPointsToGeoJSON(modelsInTile.voies, colorblindMode),
    voieLineStrings: voiesLineStringsToGeoJSON(
      modelsInTile.traces,
      colorblindMode,
    ),
  };
}
