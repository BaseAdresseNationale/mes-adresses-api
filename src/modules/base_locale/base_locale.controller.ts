import {
  Controller,
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
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { NumeroService } from '@/modules/numeros/numero.service';
import { UpdateBatchNumeroDto } from '@/modules/numeros/dto/update_batch_numero.dto';
import { DeleteBatchNumeroDto } from '@/modules/numeros/dto/delete_batch_numero.dto';

@ApiTags('base_locale')
@Controller('base_locale')
export class BaseLocaleController {
  constructor() {}
  // constructor(private numeroService: NumeroService) {}

  // @Put(':baseLocaleId/numeros/batch')
  // @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  // @ApiBody({ type: UpdateBatchNumeroDto, required: true })
  // @ApiResponse({ status: HttpStatus.OK })
  // @ApiHeader({ name: 'Token' })
  // @UseGuards(AdminGuard)
  // async batchNumeros(
  //   @Req() req: CustomRequest,
  //   @Body() updateBatchNumeroDto: UpdateBatchNumeroDto,
  //   @Res() res: Response,
  // ) {
  //   const result: any = await this.numeroService.updateBatch(
  //     req.baseLocale,
  //     updateBatchNumeroDto,
  //   );
  //   res.status(HttpStatus.OK).json(result);
  // }

  // @Put(':baseLocaleId/numeros/batch/soft-delete')
  // @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  // @ApiBody({ type: DeleteBatchNumeroDto, required: true })
  // @ApiResponse({ status: HttpStatus.OK })
  // @ApiHeader({ name: 'Token' })
  // @UseGuards(AdminGuard)
  // async softDeleteNumeros(
  //   @Req() req: CustomRequest,
  //   @Body() deleteBatchNumeroDto: DeleteBatchNumeroDto,
  //   @Res() res: Response,
  // ) {
  //   const result: any = await this.numeroService.softDeleteBatch(
  //     req.baseLocale,
  //     deleteBatchNumeroDto,
  //   );
  //   res.status(HttpStatus.OK).json(result);
  // }

  // @Delete(':baseLocaleId/numeros/batch')
  // @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  // @ApiBody({ type: DeleteBatchNumeroDto, required: true })
  // @ApiResponse({ status: HttpStatus.NO_CONTENT })
  // @ApiHeader({ name: 'Token' })
  // @UseGuards(AdminGuard)
  // async deleteNumeros(
  //   @Req() req: CustomRequest,
  //   @Body() deleteBatchNumeroDto: DeleteBatchNumeroDto,
  //   @Res() res: Response,
  // ) {
  //   await this.numeroService.deleteBatch(req.baseLocale, deleteBatchNumeroDto);
  //   res.status(HttpStatus.NO_CONTENT).send();
  // }
}
