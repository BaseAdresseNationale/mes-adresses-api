import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';

import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Task } from '@/shared/types/task.type';

@Injectable()
export class ResetCommunesForWebinaireTask implements Task {
  constructor(
    @InjectRepository(BaseLocale)
    private basesLocalesRepository: Repository<BaseLocale>,
    private readonly logger: Logger,
  ) {}

  public async run() {
    // This should run only on demo or staging environments with specific communes to reset
    if (!process.env.RESET_COMMUNES_FOR_WEBINAIRE) {
      this.logger.log(
        `No communes configured for webinaire reset. Skipping task.`,
      );
      return;
    }

    const communesToReset = process.env.RESET_COMMUNES_FOR_WEBINAIRE.split(
      ',',
    ).map((commune) => commune.trim());

    for (const commune of communesToReset) {
      await this.resetCommune(commune);
    }
  }

  private async resetCommune(communeCode: string) {
    const where: FindOptionsWhere<BaseLocale> = {
      commune: communeCode,
    };

    const balsToDelete: BaseLocale[] = await this.basesLocalesRepository.find({
      where,
      withDeleted: true,
    });

    this.logger.log(
      `Cleaning ${balsToDelete.length} BALs for commune ${communeCode}`,
      ResetCommunesForWebinaireTask.name,
    );

    for (const bal of balsToDelete) {
      try {
        this.logger.log(
          `Deleting BAL : ${bal.id}`,
          ResetCommunesForWebinaireTask.name,
        );
        await this.basesLocalesRepository.delete({ id: bal.id });
      } catch (error) {
        this.logger.error(
          `Unable to delete BAL : ${bal.id}`,
          error,
          ResetCommunesForWebinaireTask.name,
        );
      }
    }
  }
}
