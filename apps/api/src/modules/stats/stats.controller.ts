import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { Response } from 'express';

import { BaseLocale } from '@/shared/entities/base_locale.entity';

import { StatsService } from '@/modules/stats/stats.service';
import { CodeCommuneDTO } from '@/modules/stats/dto/code_commune.dto';
import {
  checkQueryDateFromTo,
  createDateObject,
} from '@/modules/stats/utils/dates.utils';
import { BasesLocalesStatusDTO } from '@/modules/stats/dto/bases_locales_status.dto';
import { BasesLocalesCreationDTO } from '@/modules/stats/dto/bases_locales_creations.dto';

@ApiTags('stats')
@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Post('bals')
  @ApiOperation({
    summary: 'Find all Bals (filtered by codeCommune)',
    operationId: 'findBalsStats',
  })
  @ApiQuery({ name: 'fields', type: String, required: false, isArray: true })
  @ApiBody({ type: CodeCommuneDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale, isArray: true })
  async getBalsStats(
    @Query('fields') fields: string[] | string,
    @Body() codeCommeDto: CodeCommuneDTO,
    @Res() res: Response,
  ) {
    const result: Omit<BaseLocale, 'token' | 'emails'>[] =
      await this.statsService.findBalInCodeCommuneWithFields(
        typeof fields === 'string' ? [fields] : fields,
        codeCommeDto.codeCommunes,
      );

    res.status(HttpStatus.OK).json(result);
  }

  @Get('bals/status')
  @ApiOperation({
    summary: 'Find all Bals status',
    operationId: 'findBalsStatusStats',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: BasesLocalesStatusDTO,
    isArray: true,
  })
  async getBalsStatus(@Res() res: Response) {
    const result: BasesLocalesStatusDTO[] =
      await this.statsService.findBalsStatusRepartition();
    res.status(HttpStatus.OK).json(result);
  }

  @Get('bals/creations')
  @ApiOperation({
    summary: 'Find all created Bals between date',
    operationId: 'findBalsCreationStats',
  })
  @ApiQuery({ name: 'from', type: String, required: true })
  @ApiQuery({ name: 'to', type: String, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    type: BasesLocalesCreationDTO,
    isArray: true,
  })
  async getBalsCreations(
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    checkQueryDateFromTo(from, to);
    const dates: { from: Date; to: Date } = createDateObject(from, to);
    const result: BasesLocalesCreationDTO[] =
      await this.statsService.findBalsCreationByDays(dates);
    res.status(HttpStatus.OK).json(result);
  }
}
