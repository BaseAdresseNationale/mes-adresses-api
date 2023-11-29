import {
  Controller,
  UseGuards,
  Res,
  Req,
  HttpStatus,
  Body,
  Get,
  Post,
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

import { Habilitation } from '@/shared/modules/api_depot/types/habilitation.type';

import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { HabilitationService } from './habilitation.service';
import { ValidatePinCodeDTO } from './dto/validate-pin-code.dto';
import { HabilitationDTO } from './dto/habilitation.dto';
import { SendPinCodeResponseDTO } from './dto/send_pin_code.response.dto';
import { ValidatePinCodeResponseDTO } from './dto/validate_pin_code.response.dto';

@ApiTags('habilitation')
@Controller('')
export class HabilitationController {
  constructor(private habilitationService: HabilitationService) {}

  @Get('/bases-locales/:baseLocaleId/habilitation/is-valid')
  @ApiOperation({
    summary: 'Find habiliation is Valid',
    operationId: 'findIsValid',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: 200, type: Boolean })
  async getHabilitationIsValid(
    @Req() req: CustomRequest,
    @Res() res: Response,
  ) {
    try {
      const isValid: boolean = await this.habilitationService.isValid(
        req.baseLocale._habilitation,
      );
      res.status(HttpStatus.OK).json(isValid);
    } catch (err) {
      res.status(HttpStatus.OK).json(false);
    }
  }

  @Get('/bases-locales/:baseLocaleId/habilitation')
  @ApiOperation({
    summary: 'Find habiliation',
    operationId: 'findHabilitation',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: 200, type: HabilitationDTO })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async getHabilitation(@Req() req: CustomRequest, @Res() res: Response) {
    try {
      const result: Habilitation = await this.habilitationService.findOne(
        req.baseLocale._habilitation,
      );
      res.status(HttpStatus.OK).json(result);
    } catch (err) {
      const { response } = err;
      res.status(response.status).json(response.data);
    }
  }

  @Post('/bases-locales/:baseLocaleId/habilitation')
  @ApiOperation({
    summary: 'Create habiliation',
    operationId: 'createHabilitation',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: 201, type: HabilitationDTO })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async createHabilitation(@Req() req: CustomRequest, @Res() res: Response) {
    const habilitation = await this.habilitationService.createOne(
      req.baseLocale,
    );

    res.send(habilitation);
  }

  @Post('/bases-locales/:baseLocaleId/habilitation/email/send-pin-code')
  @ApiOperation({
    summary: 'Send pin code of habilitation',
    operationId: 'sendPinCodeHabilitation',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: 200, type: SendPinCodeResponseDTO })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async sendPinCode(@Req() req: CustomRequest, @Res() res: Response) {
    const sendPinCodeResponse: SendPinCodeResponseDTO =
      await this.habilitationService.sendPinCode(req.baseLocale._habilitation);

    return res.status(sendPinCodeResponse.code).send({
      code: sendPinCodeResponse.code,
      message: sendPinCodeResponse.message,
    });
  }

  @Post('/bases-locales/:baseLocaleId/habilitation/email/validate-pin-code')
  @ApiOperation({
    summary: 'Valide pin code of habiliation',
    operationId: 'validePinCodeHabilitation',
  })
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: ValidatePinCodeDTO, required: true })
  @ApiResponse({ status: 200, type: ValidatePinCodeResponseDTO })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async validatePinCode(
    @Req() req: CustomRequest,
    @Body() body: ValidatePinCodeDTO,
    @Res() res: Response,
  ) {
    try {
      const validationResponse: ValidatePinCodeResponseDTO =
        await this.habilitationService.validatePinCode(
          req.baseLocale._habilitation,
          body.code,
        );

      return res.status(200).send(validationResponse);
    } catch (error) {
      return res.status(200).send({
        validated: false,
        message: error.message,
      });
    }
  }
}
