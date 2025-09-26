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
import { Numero } from '@/shared/entities/numero.entity';

import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/guards/admin.guard';
import { NumeroService } from '@/modules/numeros/numero.service';
import { UpdateNumeroDTO } from '@/modules/numeros/dto/update_numero.dto';
import { filterComments } from '@/shared/utils/filter.utils';
import { GenerateCertificatDTO } from './dto/generate_certificat.dto';
import { S3Service } from '@/shared/modules/s3/s3.service';

@ApiTags('numeros')
@Controller('numeros')
export class NumeroController {
  constructor(
    private numeroService: NumeroService,
    private s3service: S3Service,
  ) {}

  @Get(':numeroId')
  @ApiOperation({
    summary: 'Find the numero by id',
    operationId: 'findNumero',
  })
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero })
  @ApiBearerAuth('admin-token')
  find(@Req() req: CustomRequest, @Res() res: Response) {
    const numero: Numero = filterComments(req.numero, !req.isAdmin);
    res.status(HttpStatus.OK).json(numero);
  }

  @Post('/generate-certificat/:numeroId')
  @ApiOperation({
    summary: 'Generate the certificat of the numero by id',
    operationId: 'generateCertificat',
  })
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    type: String,
    description: 'URL of the generated PDF certificat',
  })
  @ApiBearerAuth('admin-token')
  async downloadCertificat(
    @Req() req: CustomRequest,
    @Body() generateCertificatDto: GenerateCertificatDTO,
    @Res() res: Response,
  ) {
    try {
      const pdfString = await this.numeroService.generateCertificatAdressage({
        numero: req.numero,
        ...generateCertificatDto,
      });
      const fileName = `certificat_adressage_${req.numero.id}.pdf`;

      await this.s3service.uploadPublicFile(
        fileName,
        Buffer.from(pdfString, 'ascii'),
        {
          ContentType: 'application/pdf',
          ContentEncoding: 'ascii',
        },
      );

      const fileUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_CONTAINER_ID}/${fileName}`;

      return res.status(HttpStatus.OK).json(fileUrl);
    } catch (err) {
      console.log('Error generating PDF:', err);
      throw err;
    }
  }

  @Put(':numeroId')
  @ApiOperation({
    summary: 'Update the numero by id',
    operationId: 'updateNumero',
  })
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero })
  @ApiBody({ type: UpdateNumeroDTO, required: true })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async update(
    @Req() req: CustomRequest,
    @Body() updateNumeroDto: UpdateNumeroDTO,
    @Res() res: Response,
  ) {
    const result: Numero = await this.numeroService.update(
      req.numero,
      updateNumeroDto,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @Put(':numeroId/soft-delete')
  @ApiOperation({
    summary: 'Soft delete the numero by id',
    operationId: 'softDeleteNumero',
  })
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Numero })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async softDelete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.numeroService.softDelete(req.numero);
    res.sendStatus(HttpStatus.NO_CONTENT);
  }

  @Delete(':numeroId')
  @ApiOperation({
    summary: 'Delete the numero by id',
    operationId: 'deleteNumero',
  })
  @ApiParam({ name: 'numeroId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async delete(@Req() req: CustomRequest, @Res() res: Response) {
    await this.numeroService.delete(req.numero);
    res.status(HttpStatus.NO_CONTENT).send();
  }
}
