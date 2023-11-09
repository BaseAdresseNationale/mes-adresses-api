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

import { Toponyme } from '@/shared/schemas/toponyme/toponyme.schema';
import { NumeroPopulate } from '@/shared/schemas/numero/numero.populate';
import { filterSensitiveFields } from '@/shared/utils/numero.utils';

import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { ToponymeService } from '@/modules/toponyme/toponyme.service';
import { ExtentedToponyme } from '@/modules/toponyme/dto/extended_toponyme.dto';
import { UpdateToponymeDto } from '@/modules/toponyme/dto/update_toponyme.dto';
import { NumeroService } from '@/modules/numeros/numero.service';

@ApiTags('toponymes')
@Controller('toponymes')
export class ToponymeController {
  constructor(
    private toponymeService: ToponymeService,
    @Inject(forwardRef(() => NumeroService))
    private numeroService: NumeroService,
  ) {}

  @Get(':toponymeId')
  @ApiOperation({ summary: 'Find Toponyme by id' })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ExtentedToponyme })
  @ApiBearerAuth('admin-token')
  async find(@Req() req: CustomRequest, @Res() res: Response) {
    const toponymeExtended: ExtentedToponyme =
      await this.toponymeService.extendToponyme(req.toponyme);
    res.status(HttpStatus.OK).json(toponymeExtended);
  }

  @Put(':toponymeId')
  @ApiOperation({ summary: 'Update Toponyme by id' })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Toponyme })
  @ApiBody({ type: UpdateToponymeDto, required: true })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async update(
    @Req() req: CustomRequest,
    @Body() updateToponymeDto: UpdateToponymeDto,
    @Res() res: Response,
  ) {
    const result: Toponyme = await this.toponymeService.update(
      req.toponyme,
      updateToponymeDto,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @Put(':toponymeId/soft-delete')
  @ApiOperation({ summary: 'Soft delete Tpponyme by id' })
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
  @ApiOperation({ summary: 'Restore Toponyme by id' })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Toponyme })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async restore(@Req() req: CustomRequest, @Res() res: Response) {
    const result: Toponyme = await this.toponymeService.restore(req.toponyme);
    res.status(HttpStatus.OK).json(result);
  }

  @Delete(':toponymeId')
  @ApiOperation({ summary: 'Delete Toponyme by id' })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async delete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.toponymeService.delete(req.toponyme);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get(':toponymeId/numeros')
  @ApiOperation({ summary: 'Find all numeros which belong to the toponyme' })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: NumeroPopulate, isArray: true })
  @ApiBearerAuth('admin-token')
  async findByToponyme(@Req() req: CustomRequest, @Res() res: Response) {
    const numeros: NumeroPopulate[] =
      await this.numeroService.findManyPopulateVoie({
        toponyme: req.toponyme._id,
      });
    const result = numeros.map((n) => filterSensitiveFields(n, !req.isAdmin));
    res.status(HttpStatus.OK).json(result);
  }
}
