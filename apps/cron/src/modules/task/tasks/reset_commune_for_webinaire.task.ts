import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';

import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';
import { Task } from '@/shared/types/task.type';

@Injectable()
export class ResetCommuneForWebinaireTask implements Task {
  constructor(
    @InjectRepository(BaseLocale)
    private basesLocalesRepository: Repository<BaseLocale>,
    private readonly logger: Logger,
  ) {}

  public async run() {
    const where: FindOptionsWhere<BaseLocale> = {
      commune: process.env.RESET_COMMUNE_FOR_WEBINAIRE,
    };

    const balsToDelete: BaseLocale[] =
      await this.basesLocalesRepository.findBy(where);

    this.logger.log(
      `Cleaning ${balsToDelete.length} BALs for commune ${process.env.RESET_COMMUNE_FOR_WEBINAIRE}`,
      ResetCommuneForWebinaireTask.name,
    );

    for (const bal of balsToDelete) {
      try {
        this.logger.log(
          `Deleting BAL : ${bal.id}`,
          ResetCommuneForWebinaireTask.name,
        );
        if (bal.status === StatusBaseLocalEnum.DEMO) {
          // Si la Bal est en demo on la supprime
          await this.basesLocalesRepository.delete({ id: bal.id });
        } else {
          // Si la Bal n'est pas en demo on l'archive
          await this.basesLocalesRepository.softDelete({ id: bal.id });
        }
      } catch (error) {
        this.logger.error(
          `Unable to delete BAL : ${bal.id}`,
          error,
          ResetCommuneForWebinaireTask.name,
        );
      }
    }
  }
}
