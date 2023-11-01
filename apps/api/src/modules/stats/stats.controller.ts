import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

import { StatsService } from '@/modules/stats/stats.service';
import { CodeCommuneDTO } from '@/modules/stats/dto/code_commune.dto';
import {
  checkQueryDateFromTo,
  createDateObject,
} from '@/modules/stats/utils/dates.utils';
import { BasesLocalesStatusDto } from '@/modules/stats/dto/bases_locales_status.dto';
import { BasesLocalesCreationDto } from '@/modules/stats/dto/bases_locales_creations.dto';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Post('bals')
  @ApiQuery({ name: 'fields', type: String, required: false, isArray: true })
  @ApiBody({ type: CodeCommuneDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale, isArray: true })
  async getBalsStats(
    @Query('fields') fields: string[],
    @Body() codeCommeDto: CodeCommuneDTO,
    @Res() res: Response,
  ) {
    console.log(fields, codeCommeDto);
    const result: BaseLocale[] =
      await this.statsService.findBalInCodeCommuneWithFields(
        fields,
        codeCommeDto.codeCommunes,
      );

    res.status(HttpStatus.OK).json(result);
  }

  @Get('bals/status')
  @ApiResponse({
    status: HttpStatus.OK,
    type: BasesLocalesStatusDto,
    isArray: true,
  })
  async getBalsStatus(@Res() res: Response) {
    const result: BasesLocalesStatusDto[] =
      await this.statsService.findBalsStatusRepartition();
    res.status(HttpStatus.OK).json(result);
  }

  @Get('bals/creations')
  @ApiQuery({ name: 'from', type: String, required: true })
  @ApiQuery({ name: 'to', type: String, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    type: BasesLocalesCreationDto,
    isArray: true,
  })
  async getBalsCreations(
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    checkQueryDateFromTo(from, to);
    const dates: { from: Date; to: Date } = createDateObject(from, to);
    const result: BasesLocalesCreationDto[] =
      await this.statsService.findBalsCreationByDays(dates);
    res.status(HttpStatus.OK).json(result);
  }
}
