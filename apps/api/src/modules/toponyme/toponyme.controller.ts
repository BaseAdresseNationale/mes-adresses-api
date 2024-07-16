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
  Inject,
  forwardRef,
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

import { Toponyme } from '@/shared/entities/toponyme.entity';
import { filterSensitiveFields } from '@/shared/utils/numero.utils';

import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { ExtentedToponymeDTO } from '@/modules/toponyme/dto/extended_toponyme.dto';
import { UpdateToponymeDTO } from '@/modules/toponyme/dto/update_toponyme.dto';
import { NumeroService } from '@/modules/numeros/numero.service';
import { Numero } from '@/shared/entities/numero.entity';

@ApiTags('toponymes')
@Controller('toponymes')
export class ToponymeController {
  constructor(
    private toponymeService: ToponymeService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
  ) {}

  @Get(':toponymeId')
  @ApiOperation({ summary: 'Find Toponyme by id', operationId: 'findToponyme' })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ExtentedToponymeDTO })
  @ApiBearerAuth('admin-token')
  async find(@Req() req: CustomRequest, @Res() res: Response) {
    const toponymeExtended: ExtentedToponymeDTO =
      await this.toponymeService.extendToponyme(req.toponyme);
    res.status(HttpStatus.OK).json(toponymeExtended);
  }

  @Put(':toponymeId')
  @ApiOperation({
    summary: 'Update Toponyme by id',
    operationId: 'updateToponyme',
  })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Toponyme })
  @ApiBody({ type: UpdateToponymeDTO, required: true })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async update(
    @Req() req: CustomRequest,
    @Body() updateToponymeDto: UpdateToponymeDTO,
    @Res() res: Response,
  ) {
    const result: Toponyme = await this.toponymeService.update(
      req.toponyme,
      updateToponymeDto,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @Put(':toponymeId/soft-delete')
  @ApiOperation({
    summary: 'Soft delete Tpponyme by id',
    operationId: 'softDeleteToponyme',
  })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Toponyme })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async softDelete(@Req() req: CustomRequest, @Res() res: Response) {
    const result: Toponyme = await this.toponymeService.softDelete(
      req.toponyme,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @Put(':toponymeId/restore')
  @ApiOperation({
    summary: 'Restore Toponyme by id',
    operationId: 'restoreToponyme',
  })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Toponyme })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async restore(@Req() req: CustomRequest, @Res() res: Response) {
    const result: Toponyme = await this.toponymeService.restore(req.toponyme);
    res.status(HttpStatus.OK).json(result);
  }

  @Delete(':toponymeId')
  @ApiOperation({
    summary: 'Delete Toponyme by id',
    operationId: 'deleteToponyme',
  })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async delete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.toponymeService.delete(req.toponyme);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get(':toponymeId/numeros')
  @ApiOperation({
    summary: 'Find all numeros which belong to the toponyme',
    operationId: 'findToponymeNumeros',
  })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero, isArray: true })
  @ApiBearerAuth('admin-token')
  async findByToponyme(@Req() req: CustomRequest, @Res() res: Response) {
    const numeros: Numero[] = await this.numeroService.findMany(
      {
        toponymeId: req.toponyme.id,
      },
      null,
      null,
      { voie: true },
    );
    const result = numeros.map((n) => filterSensitiveFields(n, !req.isAdmin));
    res.status(HttpStatus.OK).json(result);
  }
}
