import { Controller, Get, Res, Req, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiParam, ApiTags, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { CustomRequest } from '@/lib/types/request.type';
import { NumeroService } from '@/modules/numeros/numero.service';
import { Numero } from '@/modules/numeros/schema/numero.schema';
import { filterSensitiveFields } from '@/modules/numeros/numero.utils';

@ApiTags('toponymes')
@Controller('toponymes')
export class ToponymeController {
  constructor(private numeroService: NumeroService) {}

  @Get(':toponymeId/numeros')
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: 201, type: Numero, isArray: true })
  @ApiHeader({ name: 'Token' })
  async find(@Req() req: CustomRequest, @Res() res: Response) {
    const numeros: Numero[] = await this.numeroService.findAllByToponymeId(
      req.toponyme._id,
    );
    const result = numeros.map((n) => filterSensitiveFields(n, !req.isAdmin));
    res.status(HttpStatus.OK).json(result);
  }
}
