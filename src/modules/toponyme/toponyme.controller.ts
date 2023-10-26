import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  UseGuards,
  Res,
  Req,
  HttpStatus,
  Body,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiParam,
  ApiTags,
  ApiQuery,
  ApiResponse,
  ApiHeader,
  ApiBody,
  ApiOperation,
} from '@nestjs/swagger';
import { CustomRequest } from '@/lib/middlewares/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { Toponyme } from './schema/toponyme.schema';
import { ToponymeService } from './toponyme.service';
import { ExtentedToponyme } from './dto/extended_toponyme.dto';
import { UpdateToponymeDto } from './dto/update_toponyme.dto';
import { CreateToponymeDto } from './dto/create_toponyme.dto';

@ApiTags('toponymes')
@Controller()
export class ToponymeController {
  constructor(private toponymeService: ToponymeService) {}

  @Get('toponymes/:toponymeId')
  @ApiOperation({ summary: 'Find Toponyme by id' })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ExtentedToponyme })
  @ApiHeader({ name: 'Token' })
  async find(@Req() req: CustomRequest, @Res() res: Response) {
    const toponymeExtended: ExtentedToponyme =
      await this.toponymeService.extendToponyme(req.toponyme);
    res.status(HttpStatus.OK).json(toponymeExtended);
  }

  @Put('toponymes/:toponymeId')
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

  @Put('toponymes/:toponymeId/soft-delete')
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

  @Put('toponymes/:toponymeId/restore')
  @ApiOperation({ summary: 'Restore Toponyme by id' })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Toponyme })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async restore(@Req() req: CustomRequest, @Res() res: Response) {
    const result: Toponyme = await this.toponymeService.restore(req.toponyme);
    res.status(HttpStatus.OK).json(result);
  }

  @Delete('toponymes/:toponymeId')
  @ApiOperation({ summary: 'Delete Toponyme by id' })
  @ApiParam({ name: 'toponymeId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async delete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.toponymeService.delete(req.toponyme);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get('/bases_locales/:baseLocaleId/toponymes')
  @ApiOperation({ summary: 'Find all Toponymes in Bal' })
  @ApiQuery({ name: 'isDelete', type: Boolean, required: false })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ExtentedToponyme, isArray: true })
  @ApiHeader({ name: 'Token' })
  async findByBal(
    @Req() req: CustomRequest,
    @Query() isDeleted: boolean = false,
    @Res() res: Response,
  ) {
    const toponymes: Toponyme[] = await this.toponymeService.findAllByBalId(
      req.baseLocale._id,
      isDeleted,
    );
    const extendedToponyme: ExtentedToponyme[] =
      await this.toponymeService.extendToponymes(toponymes);
    res.status(HttpStatus.OK).json(extendedToponyme);
  }

  @Post('/bases_locales/:baseLocaleId/toponymes')
  @ApiOperation({ summary: 'Create Toponyme in Bal' })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: CreateToponymeDto, required: true })
  @ApiResponse({ status: HttpStatus.CREATED, type: Toponyme, isArray: true })
  @ApiHeader({ name: 'Token' })
  async create(
    @Req() req: CustomRequest,
    @Body() createToponymeDto: CreateToponymeDto,
    @Res() res: Response,
  ) {
    const toponyme: Toponyme = await this.toponymeService.create(
      req.baseLocale,
      createToponymeDto,
    );
    res.status(HttpStatus.CREATED).json(toponyme);
  }
}
