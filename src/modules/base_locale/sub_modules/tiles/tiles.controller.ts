import { Controller, Res, Req, Get, Query, Param } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiParam,
  ApiTags,
  ApiQuery,
  ApiHeader,
  ApiOperation,
} from '@nestjs/swagger';
import { CustomRequest } from '@/lib/middlewares/types/request.type';
import { TilesService } from './tiles.service';

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
  find(
    @Req() req: CustomRequest,
    @Param() z: number,
    @Param() x: number,
    @Param() y: number,
    @Query() colorblindMode: boolean,
    @Res() res: Response,
  ) {
    // const geoJson = await BaseLocale.getGeoJsonByTile(
    //   req.baseLocale._id,
    //   { z, x, y },
    //   colorblindMode,
    // );
    // const tiles = BaseLocale.getTiles(geoJson, { z, x, y });
    // if (tiles === null) {
    //   return res.status(204).send();
    // }
    // const pbf = vtpbf.fromGeojsonVt(tiles);
    // res
    //   .set({
    //     'Content-Type': 'application/x-protobuf',
    //     'Content-Encoding': 'gzip',
    //   })
    //   .send(await gzip(Buffer.from(pbf)));
  }
}
