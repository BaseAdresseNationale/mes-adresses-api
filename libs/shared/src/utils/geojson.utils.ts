export const createGeoJSONFeature = (
  geometry: GeoJSON.Geometry,
  properties?: GeoJSON.GeoJsonProperties,
  id?: string | number,
): GeoJSON.Feature => {
  return {
    type: 'Feature',
    geometry,
    properties: properties || {},
    ...(id ? { id } : {}),
  };
};
