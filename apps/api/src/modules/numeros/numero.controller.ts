import {
  Controller,
  Get,
  Put,
  Delete,
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
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { Numero } from '@/shared/entities/numero.entity';
import { filterSensitiveFields } from '@/shared/utils/numero.utils';

import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { NumeroService } from '@/modules/numeros/numero.service';
import { UpdateNumeroDTO } from '@/modules/numeros/dto/update_numero.dto';

@ApiTags('numeros')
@Controller('numeros')
export class NumeroController {
  constructor(private numeroService: NumeroService) {}

  @Get(':numeroId')
  @ApiOperation({
    summary: 'Find the numero by id',
    operationId: 'findNumero',
  })
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero })
  @ApiBearerAuth('admin-token')
  find(@Req() req: CustomRequest, @Res() res: Response) {
    const numero: Numero = filterSensitiveFields(req.numero, !req.isAdmin);
    res.status(HttpStatus.OK).json(numero);
  }

  @Put(':numeroId')
  @ApiOperation({
    summary: 'Update the numero by id',
    operationId: 'updateNumero',
  })
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero })
  @ApiBody({ type: UpdateNumeroDTO, required: true })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async update(
    @Req() req: CustomRequest,
    @Body() updateNumeroDto: UpdateNumeroDTO,
    @Res() res: Response,
  ) {
    const result: Numero = await this.numeroService.update(
      req.numero,
      updateNumeroDto,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @Put(':numeroId/soft-delete')
  @ApiOperation({
    summary: 'Soft delete the numero by id',
    operationId: 'softDeleteNumero',
  })
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async softDelete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.numeroService.softDelete(req.numero);
    res.sendStatus(HttpStatus.NO_CONTENT);
  }

  @Delete(':numeroId')
  @ApiOperation({
    summary: 'Delete the numero by id',
    operationId: 'deleteNumero',
  })
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async delete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.numeroService.delete(req.numero);
    res.status(HttpStatus.NO_CONTENT).send();
  }
}
