import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { StatusBaseLocalEnum } from '@/shared/entities/base_locale.entity';
import { Task } from '../task_queue.class';
import { TypeNumerotationEnum, Voie } from '@/shared/entities/voie.entity';
import { S3Service } from '@/shared/modules/s3/s3.service';

@Injectable()
export class UploadTracesTask implements Task {
  title: string = 'Upload traces';

  constructor(
    @InjectRepository(Voie)
    private voiesRepository: Repository<Voie>,
    private readonly s3Service: S3Service,
    private readonly logger: Logger,
  ) {}

  public async run() {
    const rawFilaires = await this.voiesRepository
      .createQueryBuilder('voies')
      .select([
        'bal.commune as commune',
        'voies.nom as nom',
        'ST_AsGeoJSON(voies.trace) as trace',
        'voies.updatedAt as updatedAt',
        'voies.createdAt as createdAt',
      ])
      .innerJoin('voies.baseLocale', 'bal')
      .where('voies.type_numerotation = :typeNumerotation', {
        typeNumerotation: TypeNumerotationEnum.METRIQUE,
      })
      .andWhere('bal.status = :status', {
        status: StatusBaseLocalEnum.PUBLISHED,
      })
      .andWhere('voies.trace IS NOT NULL')
      .getRawMany();

    this.logger.log(
      `Number of traces to upload : ${rawFilaires.length}`,
      UploadTracesTask.name,
    );

    const uploadResponse = await this.s3Service.uploadPublicFile(
      'export_filaires-de-voie.json',
      Buffer.from(JSON.stringify(rawFilaires), 'utf-8'),
      {
        ContentType: 'application/json',
        ContentEncoding: 'utf-8',
      },
    );

    this.logger.log(`Upload response : ${JSON.stringify(uploadResponse)}`);
  }
}
