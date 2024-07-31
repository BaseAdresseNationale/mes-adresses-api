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
import { ApiParam, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import * as geojsonvt from 'geojson-vt';
import * as vtpbf from 'vt-pbf';
import * as zlib from 'zlib';
import { promisify } from 'util';

import { CustomRequest } from '@/lib/types/request.type';
import { TilesService } from '@/modules/base_locale/sub_modules/tiles/tiles.service';
import { GeoJsonCollectionType } from '@/modules/base_locale/sub_modules/tiles/types/features.type';

const gzip = promisify(zlib.gzip);

@ApiTags('tiles')
@Controller()
export class TilesController {
  constructor(private tilesService: TilesService) {}

  @Get('/bases-locales/:baseLocaleId/tiles/:z/:x/:y.pbf')
  @ApiOperation({
    summary: 'Get tile (with voies and numeros features)',
    operationId: 'getBaseLocaleTile',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiParam({ name: 'z', required: true, type: String })
  @ApiParam({ name: 'x', required: true, type: String })
  @ApiParam({ name: 'y', required: true, type: String })
  @ApiQuery({ name: 'colorblindMode', type: Boolean })
  async getTiles(
    @Req() req: CustomRequest,
    @Param('z') z: string,
    @Param('x') x: string,
    @Param('y') y: string,
    @Query('colorblindMode') colorblindMode: boolean,
    @Res() res: Response,
  ) {
    const tile: number[] = [parseInt(x), parseInt(y), parseInt(z)];
    const { numeroPoints, voiePoints, voieLineStrings }: GeoJsonCollectionType =
      await this.tilesService.getGeoJsonByTile(
        req.baseLocale.id,
        tile,
        colorblindMode,
      );
    const options = { maxZoom: 20 };
    const numerosTiles = geojsonvt(numeroPoints, options).getTile(
      tile[2],
      tile[0],
      tile[1],
    );
    const voieTiles = geojsonvt(voiePoints, options).getTile(
      tile[2],
      tile[0],
      tile[1],
    );
    const voieTraceTiles = geojsonvt(voieLineStrings, options).getTile(
      tile[2],
      tile[0],
      tile[1],
    );

    if (!numerosTiles && !voieTiles && !voieTraceTiles) {
      return res.status(HttpStatus.NO_CONTENT).send();
    }

    const sourcesLayers = {
      ...(numerosTiles && { 'numeros-points': numerosTiles }),
      ...(voieTiles && { 'voies-points': voieTiles }),
      ...(voieTraceTiles && { 'voies-linestrings': voieTraceTiles }),
    };

    const pbf = vtpbf.fromGeojsonVt(sourcesLayers);

    const compressedPbf = await gzip(Buffer.from(pbf));

    return res
      .set({
        'Content-Type': 'application/x-protobuf',
        'Content-Encoding': 'gzip',
      })
      .send(compressedPbf);
  }
}
