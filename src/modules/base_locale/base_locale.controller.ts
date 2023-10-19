import {
  Controller,
  Put,
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
import { UpdateBatchNumeroDto } from '@/modules/numeros/dto/update_batch_numero.dto';
import { Numero } from '@/modules/numeros/schema/numero.schema';

@ApiTags('base_locale')
@Controller('base_locale')
export class BaseLocaleController {
  constructor(private numeroService: NumeroService) {}

  @Put(':baseLocaleId/numeros/batch')
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: UpdateBatchNumeroDto, required: true })
  @ApiResponse({ status: 200 })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async createNumero(
    @Req() req: CustomRequest,
    @Body() updateBatchNumeroDto: UpdateBatchNumeroDto,
    @Res() res: Response,
  ) {
    const result: Numero[] = await this.numeroService.updateBatch(
      req.baseLocale,
      updateBatchNumeroDto,
    );
    res.status(HttpStatus.OK).json(result);
  }
}
