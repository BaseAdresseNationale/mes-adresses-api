import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { getCommuneActuelle } from '@/shared/utils/cog.utils';
import { CustomRequest } from '@/lib/types/request.type';
import { TrustedClientGuard } from '@/lib/guards/trusted_client.guard';
import { BaseLocaleService } from '../base_locale/base_locale.service';

export const ACTING_USER_HEADER = 'x-acting-user';

@ApiTags('trusted-client')
@ApiSecurity('client-secret')
@UseGuards(TrustedClientGuard)
@Controller('trusted-client')
export class TrustedClientController {
  constructor(
    private baseLocaleService: BaseLocaleService,
    private readonly logger: Logger,
  ) {}

  @Get('communes/:codeCommune/bases-locales')
  @ApiOperation({
    summary:
      'Find all bases locales of a commune, token included (trusted clients only)',
    operationId: 'findCommuneBasesLocalesWithToken',
  })
  @ApiParam({ name: 'codeCommune', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: BaseLocale, isArray: true })
  async findCommuneBasesLocales(
    @Param('codeCommune') codeCommune: string,
    @Req() req: CustomRequest,
    @Res() res: Response,
  ) {
    if (!getCommuneActuelle(codeCommune)) {
      throw new HttpException(
        `Commune ${codeCommune} inconnue`,
        HttpStatus.NOT_FOUND,
      );
    }

    this.logger.log(
      `Accès aux BAL de la commune ${codeCommune} par ${
        req.headers[ACTING_USER_HEADER] || 'utilisateur inconnu'
      }`,
      TrustedClientController.name,
    );

    // Les BAL supprimées (deletedAt) sont exclues par défaut par TypeORM
    const basesLocales: BaseLocale[] = await this.baseLocaleService.findMany({
      commune: codeCommune,
    });

    res.status(HttpStatus.OK).json(basesLocales);
  }
}
