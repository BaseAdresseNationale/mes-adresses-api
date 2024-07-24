import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { groupBy, mapValues } from 'lodash';
import { format } from 'date-fns';

import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';

import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { filterSensitiveFields } from '@/modules/base_locale/utils/base_locale.utils';
import { BasesLocalesStatusDTO } from '@/modules/stats/dto/bases_locales_status.dto';
import { BasesLocalesCreationDTO } from '@/modules/stats/dto/bases_locales_creations.dto';
import { Between, FindOptionsSelect, FindOptionsWhere, In, Not } from 'typeorm';

@Injectable()
export class StatsService {
  constructor(
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
  ) {}

  public async findBalInCodeCommuneWithFields(
    fields: string[] = [],
    codeCommunes: string[] = [],
  ): Promise<Omit<BaseLocale, 'token' | 'emails'>[]> {
    const where: FindOptionsWhere<BaseLocale> = {
      status: Not(StatusBaseLocalEnum.DEMO),
      ...(codeCommunes &&
        codeCommunes.length > 0 && { commune: In(codeCommunes) }),
    };
    const select: FindOptionsSelect<BaseLocale> = { id: true };
    if (fields.length > 0) {
      fields.forEach((f) => {
        select[f] = 1;
      });
    }

    const bals: BaseLocale[] = await this.baseLocaleService.findMany(
      where,
      select,
    );

    return bals.map((bal) => filterSensitiveFields(bal));
  }

  public async findBalsStatusRepartition(): Promise<BasesLocalesStatusDTO[]> {
    const result: any[] = await this.baseLocaleService.countGroupByStatus();
    return result.map(({ status, count }) => ({
      status,
      count: Number(count),
    }));
  }

  public async findBalsCreationByDays({
    from,
    to,
  }: {
    from: Date;
    to: Date;
  }): Promise<BasesLocalesCreationDTO[]> {
    const where: FindOptionsWhere<BaseLocale> = {
      createdAt: Between(from, to),
    };
    const bals: BaseLocale[] = await this.baseLocaleService.findMany(where);
    const balsGroupByDays: Record<string, BaseLocale> = groupBy(
      bals,
      (bal: BaseLocale) => format(bal.createdAt, 'yyyy-MM-dd'),
    );
    return Object.entries(balsGroupByDays).map(([date, bals]) => {
      const balsGroupedByCommune = groupBy(bals, (bal) => bal.commune);
      return {
        date,
        createdBAL: mapValues(balsGroupedByCommune, (balsByCommune) => ({
          total: balsByCommune.length,
          published: balsByCommune.filter(
            ({ status }) => status === StatusBaseLocalEnum.PUBLISHED,
          ).length,
          draft: balsByCommune.filter(
            ({ status }) => status === StatusBaseLocalEnum.DRAFT,
          ).length,
          demo: balsByCommune.filter(({ status }) => status === 'demo').length,
        })),
      };
    });
  }
}
