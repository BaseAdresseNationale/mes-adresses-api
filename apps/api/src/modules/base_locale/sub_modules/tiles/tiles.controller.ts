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
import * as vtpbf from 'vt-pbf';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { CustomRequest } from '@/lib/types/request.type';
import { TilesService } from '@/modules/base_locale/sub_modules/tiles/tiles.service';
import {
  GeoJsonCollectionType,
  TileType,
} from '@/modules/base_locale/sub_modules/tiles/types/features.type';

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
  @ApiHeader({ name: 'Token' })
  async getTiles(
    @Req() req: CustomRequest,
    @Param('z') z: string,
    @Param('x') x: string,
    @Param('y') y: string,
    @Query('colorblindMode') colorblindMode: boolean,
    @Res() res: Response,
  ) {
    const tile: TileType = { z: parseInt(z), x: parseInt(x), y: parseInt(y) };
    const geoJson: GeoJsonCollectionType =
      await this.tilesService.getGeoJsonByTile(
        req.baseLocale._id,
        tile,
        colorblindMode,
      );
    const options = { maxZoom: 20 };

    const numerosTiles = geojsonvt(geoJson.numeroPoints, options).getTile(
      tile.z,
      tile.x,
      tile.y,
    );
    const voieTiles = geojsonvt(geoJson.voiePoints, options).getTile(
      tile.z,
      tile.x,
      tile.y,
    );
    const voieTraceTiles = geojsonvt(geoJson.voieLineStrings, options).getTile(
      tile.z,
      tile.x,
      tile.y,
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
