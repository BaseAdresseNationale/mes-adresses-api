import { Numero } from '@/shared/schemas/numero/numero.schema';
import { Voie } from '@/shared/schemas/voie/voie.schema';
import { FeatureCollection } from 'geojson';

export type GeoJsonCollectionType = {
  numeroPoints: FeatureCollection;
  voiePoints: FeatureCollection;
  voieLineStrings: FeatureCollection;
};

export type ModelsInTileType = {
  numeros: Numero[];
  voies: Voie[];
  traces: Voie[];
};

export type TileType = { z: number; x: number; y: number };
