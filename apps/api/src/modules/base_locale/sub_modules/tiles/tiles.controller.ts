import {
  Controller,
  Res,
  Req,
  Get,
  Query,
  Param,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiParam,
  ApiTags,
  ApiQuery,
  ApiHeader,
  ApiOperation,
} from '@nestjs/swagger';
import * as geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';

import { CustomRequest } from '@/lib/types/request.type';
import { TilesService } from '@/modules/base_locale/sub_modules/tiles/tiles.service';
import {
  GeoJsonCollectionType,
  TileType,
} from '@/modules/base_locale/sub_modules/tiles/types/features.type';

@ApiTags('tiles')
@Controller()
export class TilesController {
  constructor(private tilesService: TilesService) {}

  @Get('/bases-locales/:baseLocaleId/tiles/:z/:x/:y.pbf')
  @ApiOperation({ summary: 'Find the numero by id' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiParam({ name: 'z', required: true, type: Number })
  @ApiParam({ name: 'x', required: true, type: Number })
  @ApiParam({ name: 'y', required: true, type: Number })
  @ApiQuery({ name: 'colorblindMode', type: Boolean })
  @ApiHeader({ name: 'Token' })
  async getTiles(
    @Req() req: CustomRequest,
    @Param('z') z: number,
    @Param('x') x: number,
    @Param('y') y: number,
    @Query() colorblindMode: boolean,
    @Res() res: Response,
  ) {
    const tile: TileType = { z, x, y };
    const geoJson: GeoJsonCollectionType =
      await this.tilesService.getGeoJsonByTile(
        req.baseLocale._id,
        tile,
        colorblindMode,
      );
    const options = { maxZoom: 20 };
    const tileIndex = geojsonvt(geoJson.numeroPoints, options);
    console.log('tileIndex', tileIndex);
    const numerosTiles = tileIndex.getTile(z, x, y);
    // const voieTiles = geojsonvt(geoJson.voiePoints, options).getTile(z, x, y);
    // const voieTraceTiles = geojsonvt(geoJson.voieLineStrings, options).getTile(
    //   z,
    //   x,
    //   y,
    // );
    if (!numerosTiles) {
      console.log('SEND NO CONTENT');
      return res.status(HttpStatus.NO_CONTENT).send();
    }
    // if (!numerosTiles && !voieTiles && !voieTraceTiles) {
    //   console.log('SEND NO CONTENT');
    //   return res.status(HttpStatus.NO_CONTENT).send();
    // }

    const sourcesLayers = {
      ...(numerosTiles && { 'numeros-points': numerosTiles }),
      // ...(voieTiles && { 'voies-points': voieTiles }),
      // ...(voieTraceTiles && { 'voies-linestrings': voieTraceTiles }),
    };
    console.log(sourcesLayers);
    const pbf = vtpbf.fromGeojsonVt(sourcesLayers);
    return res
      .set({
        'Content-Type': 'application/x-protobuf',
        'Content-Encoding': 'gzip',
      })
      .send(pbf);
  }
}
