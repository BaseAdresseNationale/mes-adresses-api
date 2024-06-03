import { Schema, model, connect, disconnect } from 'mongoose';
import * as turf from '@turf/turf';
import { range, maxBy } from 'lodash';
import { getPositionPriorityByType } from '@ban-team/adresses-util';
import {
  pointToTile,
} from '@mapbox/tilebelt';
import * as dotenv from 'dotenv';
dotenv.config();

// VOIE
interface IVoie {
  _id: any;
  centroid: any;
  centroidTiles: string[] | null;
  typeNumerotation: string;
  traceTiles: string[] | null;
}
const VoieSchema = new Schema<IVoie>({
  _id: { type: Object },
  centroid: { type: Object },
  centroidTiles: { type: [String] },
  typeNumerotation: { type: String },
  traceTiles: { type: [String] },
});
const VoiesModel = model<IVoie>('voies', VoieSchema);

// VOIE
interface INumero {
  positions: any[];
}
const NumeroSchema = new Schema<INumero>({
  positions: { type: [Object] },
});
const NumeroModel = model<INumero>('numeros', NumeroSchema);

const ZOOM = {
  NUMEROS_ZOOM: {
    minZoom: 13,
    maxZoom: 19,
  },
  VOIE_ZOOM: {
    minZoom: 13,
    maxZoom: 19,
  },
  TRACE_DISPLAY_ZOOM: {
    minZoom: 13,
    maxZoom: 19,
  },
  TRACE_MONGO_ZOOM: {
    zoom: 13,
  },
};

export function getPriorityPosition(positions) {
  return positions.length === 0
    ? {}
    : maxBy(positions, (p) => getPositionPriorityByType(p.type));
}

function roundCoordinate(
  coordinate: number,
  precision: number = 6,
): number {
  return Number.parseFloat(coordinate.toFixed(precision));
}

function getTilesByPosition(
  point: any,
  {
    minZoom,
    maxZoom,
  }: { minZoom: number; maxZoom: number } = ZOOM.NUMEROS_ZOOM,
): string[] | null {
  if (!point || !minZoom || !maxZoom) {
    return null;
  }

  const lon: number = roundCoordinate(point.coordinates[0], 6);
  const lat: number = roundCoordinate(point.coordinates[1], 6);

  const tiles: string[] = range(minZoom, maxZoom + 1).map((zoom) => {
    const [x, y, z]: number[] = pointToTile(lon, lat, zoom);
    return `${z}/${x}/${y}`;
  });

  return tiles;
}

async function calcMetaTilesVoie(voie: IVoie) {
  voie.centroid = null;
  voie.centroidTiles = null;
  voie.traceTiles = null;

  try {
    const numeros = await NumeroModel.find(
      { voie: voie._id, _deleted: null },
      { positions: 1, voie: 1 },
    );
    if (numeros.length > 0) {
      const coordinatesNumeros = numeros
        .filter((n) => n.positions && n.positions.length > 0)
        .map((n) => getPriorityPosition(n.positions)?.point?.coordinates);
      // CALC CENTROID
      if (coordinatesNumeros.length > 0) {
        const featureCollection = turf.featureCollection(
          coordinatesNumeros.map((n) => turf.point(n)),
        );
        voie.centroid = turf.centroid(featureCollection);
        voie.centroidTiles = getTilesByPosition(
          voie.centroid.geometry,
          ZOOM.VOIE_ZOOM,
        );
      }
    }
  } catch (error) {
    console.error(error, voie._id);
  }

  return voie;
}

async function run() {
  await connect(`${process.env.MONGODB_URL}/${process.env.MONGODB_DBNAME}`);

  const total = await VoiesModel.count({centroid: {$exists: false}, typeNumerotation: {$ne: 'metrique'}})
  console.log(`START ${total} VOIES`)

  const voiesCursor = VoiesModel.find({centroid: {$exists: false}, typeNumerotation: {$ne: 'metrique'}})
  let count = 0

  for await (const v of voiesCursor) {
    count++

    await calcMetaTilesVoie(v)
    await VoiesModel.updateOne(
      {_id: v._id},
      { $set: { centroid: v.centroid, centroidTiles: v.centroidTiles, traceTiles: v.traceTiles }}
    )
    if (count % 100 === 0) {
      console.log(`${count}/${total}`)
    }
  }

  await disconnect()
  process.exit(1);
}

run().catch((err) => console.log(err));
