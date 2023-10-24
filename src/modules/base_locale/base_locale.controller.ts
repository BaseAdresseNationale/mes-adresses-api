import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { BaseLocaleService } from './base_locale.service';
import { CreateBaseLocaleDTO } from './dto/create_base_locale.dto';

@ApiTags('base_locale')
@Controller('base_locale')
export class BaseLocaleController {
  constructor(private baseLocaleService: BaseLocaleService) {}

  @Get('/bases-locales')
  @ApiResponse({ status: 200 })
  async getBasesLocales(@Req() req: Request, @Res() res: Response) {
    const basesLocales = await this.baseLocaleService.findMany();

    res.status(HttpStatus.OK).json(basesLocales);
  }

  @Post('/bases-locales')
  @ApiBody({ type: CreateBaseLocaleDTO, required: true })
  @ApiResponse({ status: 200 })
  async createBaseLocale(
    @Req() req: Request,
    @Body() createBaseLocaleDTO: CreateBaseLocaleDTO,
    @Res() res: Response,
  ) {
    const newBaseLocale =
      await this.baseLocaleService.createOne(createBaseLocaleDTO);

    res.status(HttpStatus.OK).json(newBaseLocale);
  }
}
