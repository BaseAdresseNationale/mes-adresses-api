import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaseLocaleService } from './base_locale.service';

@ApiTags('base_locale')
@Controller('base_locale')
export class BaseLocaleController {
  constructor(private baseLocaleService: BaseLocaleService) {}

  @Get('/bases-locales')
  @ApiResponse({ status: 200 })
  async getBasesLocales(@Req() req: Request, @Res() res: Response) {
    const basesLocales = await this.baseLocaleService.findMany();

    res.send(basesLocales);
  }

  @Post('/bases-locales')
  @ApiBody({ type: CreateBaseLocaleDTO, required: true })
  @ApiResponse({ status: 200 })
  async createBaseLocale(@Req() req: Request, @Res() res: Response) {
    const newBaseLocale = await this.baseLocaleService.createOne(req.body);

    res.send(newBaseLocale);
  }
}
