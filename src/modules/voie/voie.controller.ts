import {
  Controller,
  Post,
  Get,
  UseGuards,
  Res,
  Req,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiParam,
  ApiTags,
  ApiResponse,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { NumeroService } from '@/modules/numeros/numero.service';
import { CreateNumeroDto } from '@/modules/numeros/dto/create_numero.dto';
import { Numero } from '@/modules/numeros/schema/numero.schema';
import { filterSensitiveFields } from '@/modules/numeros/numero.utils';

@ApiTags('voies')
@Controller('voies')
export class VoieController {
  constructor(private numeroService: NumeroService) {}

  @Get(':voieId/numeros')
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: 200, type: Numero, isArray: true })
  @ApiHeader({ name: 'Token' })
  async find(@Req() req: CustomRequest, @Res() res: Response) {
    const numeros: Numero[] = await this.numeroService.findAllByVoieId(
      req.voie._id,
    );
    const result = numeros.map((n) => filterSensitiveFields(n, !req.isAdmin));
    res.status(HttpStatus.OK).json(result);
  }

  @Post(':voieId/numeros')
  @ApiParam({ name: 'voieId', required: true, type: String })
  @ApiBody({ type: CreateNumeroDto, required: true })
  @ApiResponse({ status: 201, type: Numero })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async createNumero(
    @Req() req: CustomRequest,
    @Body() createNumeroDto: CreateNumeroDto,
    @Res() res: Response,
  ) {
    const result: Numero = await this.numeroService.create(
      req.voie,
      createNumeroDto,
    );
    res.status(HttpStatus.CREATED).json(result);
  }
}
