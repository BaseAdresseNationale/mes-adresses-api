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

import { CustomRequest } from '@/lib/types/request.type';
import { TilesService } from '@/modules/base_locale/sub_modules/tiles/tiles.service';

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
    const compressedPbf = await this.tilesService.getPbfTile(
      req.baseLocale.id,
      { x: parseInt(x), y: parseInt(y), z: parseInt(z) },
      colorblindMode,
    );

    if (compressedPbf === undefined) {
      return res.sendStatus(HttpStatus.NO_CONTENT);
    }

    return res
      .set({
        'Content-Type': 'application/x-protobuf',
        'Content-Encoding': 'gzip',
      })
      .send(compressedPbf);
  }
}
