import { FeatureCollection } from 'geojson';

export type GeoJsonCollectionType = {
  numeroPoints: FeatureCollection;
  voiePoints: FeatureCollection;
  voieLineStrings: FeatureCollection;
};
