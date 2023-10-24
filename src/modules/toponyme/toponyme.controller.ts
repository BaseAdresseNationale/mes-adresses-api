import { Controller, Get, Res, Req, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiParam, ApiTags, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { CustomRequest } from '@/lib/types/request.type';
import { NumeroService } from '@/modules/numeros/numero.service';
import { NumeroPopulate } from '@/modules/numeros/schema/numero.populate';
import { filterSensitiveFields } from '@/modules/numeros/numero.utils';

@ApiTags('toponymes')
@Controller('toponymes')
export class ToponymeController {
  constructor() {}

  // @Get(':toponymeId/numeros')
  // @ApiParam({ name: 'toponymeId', required: true, type: String })
  // @ApiResponse({ status: 201, type: NumeroPopulate, isArray: true })
  // @ApiHeader({ name: 'Token' })
  // async find(@Req() req: CustomRequest, @Res() res: Response) {
  //   const numeros: NumeroPopulate[] =
  //     await this.numeroService.findAllByToponymeId(req.toponyme._id);
  //   const result = numeros.map((n) => filterSensitiveFields(n, !req.isAdmin));
  //   res.status(HttpStatus.OK).json(result);
  // }
}
