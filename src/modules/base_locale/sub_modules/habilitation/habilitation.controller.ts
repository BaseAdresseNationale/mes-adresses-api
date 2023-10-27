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
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { CustomRequest } from '@/lib/middlewares/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { HabilitationService } from './habilitation.service';
import { Habilitation } from './types/habilitation.type';
import { ValidatePinCodeDTO } from './dto/validate-pin-code.dto';

@ApiTags('habilitation')
@Controller('habilitation')
export class HabilitationController {
  constructor(private habilitationService: HabilitationService) {}

  @Get('/bases-locales/:baseLocaleId/habilitation')
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: 200 })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async getHabilitation(@Req() req: CustomRequest, @Res() res: Response) {
    const result: Habilitation = await this.habilitationService.findOne(
      req.baseLocale._habilitation,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @Post('/bases-locales/:baseLocaleId/habilitation')
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: 200 })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async createHabilitation(@Req() req: CustomRequest, @Res() res: Response) {
    const habilitation = await this.habilitationService.createOne(
      req.baseLocale,
    );

    res.send(habilitation);
  }

  @Post('/bases-locales/:baseLocaleId/habilitation/email/send-pin-code')
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiResponse({ status: 200 })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async sendPinCode(@Req() req: CustomRequest, @Res() res: Response) {
    const sendPinCodeResponse = await this.habilitationService.sendPinCode(
      req.baseLocale._habilitation,
    );

    return res.status(sendPinCodeResponse.code).send({
      code: sendPinCodeResponse.code,
      message: sendPinCodeResponse.message,
    });
  }

  @Post('/bases-locales/:baseLocaleId/habilitation/email/validate-pin-code')
  @ApiParam({ name: 'baseLocaleId', required: true, type: String })
  @ApiBody({ type: ValidatePinCodeDTO, required: true })
  @ApiResponse({ status: 200 })
  @ApiHeader({ name: 'Token' })
  @UseGuards(AdminGuard)
  async validatePinCode(
    @Req() req: CustomRequest,
    @Body() body: ValidatePinCodeDTO,
    @Res() res: Response,
  ) {
    try {
      const validationResponse = await this.habilitationService.validatePinCode(
        req.baseLocale._habilitation,
        body.code,
      );

      if (validationResponse.validated === false) {
        return res.status(200).send({ code: 200, ...validationResponse });
      }

      res.send(validationResponse);
    } catch (error) {
      return res.status(200).send({ code: 200, message: error.message });
    }
  }
}
