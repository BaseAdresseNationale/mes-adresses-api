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
  ApiHeader,
  ApiBody,
  ApiOperation,
} from '@nestjs/swagger';
import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { Toponyme } from './schema/toponyme.schema';
import { ToponymeService } from './toponyme.service';
import { ExtentedToponyme } from './dto/extended_toponyme.dto';
import { UpdateToponymeDto } from './dto/update_toponyme.dto';
import { NumeroPopulate } from '../numeros/schema/numero.populate';
import { filterSensitiveFields } from '../numeros/numero.utils';
import { NumeroService } from '../numeros/numero.service';

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
  @ApiHeader({ name: 'Token' })
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
  @ApiHeader({ name: 'Token' })
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
  @ApiHeader({ name: 'Token' })
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
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async restore(@Req() req: CustomRequest, @Res() res: Response) {
    const result: Toponyme = await this.toponymeService.restore(req.toponyme);
    res.status(HttpStatus.OK).json(result);
  }

  @Delete(':toponymeId')
  @ApiOperation({ summary: 'Delete Toponyme by id' })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async delete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.toponymeService.delete(req.toponyme);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get(':toponymeId/numeros')
  @ApiOperation({ summary: 'Find all numeros which belong to the toponyme' })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: NumeroPopulate, isArray: true })
  @ApiHeader({ name: 'Token' })
  async findByToponyme(@Req() req: CustomRequest, @Res() res: Response) {
    const numeros: NumeroPopulate[] =
      await this.numeroService.findManyPopulateVoie({
        toponyme: req.toponyme._id,
      });
    const result = numeros.map((n) => filterSensitiveFields(n, !req.isAdmin));
    res.status(HttpStatus.OK).json(result);
  }
}
