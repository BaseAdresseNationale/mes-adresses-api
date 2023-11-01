import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { FilterQuery, PipelineStage, Types } from 'mongoose';
import { groupBy, mapValues } from 'lodash';
import { format } from 'date-fns';

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';

import { BaseLocaleService } from '@/modules/base_locale/base_locale.service';
import { BasesLocalesStatusDto } from '@/modules/stats/dto/bases_locales_status.dto';
import { BasesLocalesCreationDto } from '@/modules/stats/dto/bases_locales_creations.dto';

@Injectable()
export class StatsService {
  constructor(
    @Inject(forwardRef(() => BaseLocaleService))
    private baseLocaleService: BaseLocaleService,
  ) {}

  public async findBalInCodeCommuneWithFields(
    fields: string[] = [],
    codeCommunes: string[] = [],
  ): Promise<BaseLocale[]> {
    const filters: FilterQuery<BaseLocale> = {
      status: { $ne: 'demo' },
      _deleted: null,
      ...(codeCommunes && { commune: { $in: codeCommunes } }),
    };
    const selector: Record<string, number> = null;
    if (fields.length > 0) {
      fields.forEach((f) => {
        selector[f] = 1;
      });
    }
    return this.baseLocaleService.findMany(filters, selector);
  }

  public async findBalsStatusRepartition(): Promise<BasesLocalesStatusDto[]> {
    const aggregation: PipelineStage[] = [
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ];
    const statusRepartition: { _id: Types.ObjectId; count: number }[] =
      await this.baseLocaleService.aggregate(aggregation);

    return statusRepartition.map(({ _id, count }) => ({ status: _id, count }));
  }

  public async findBalsCreationByDays(dates: {
    from: Date;
    to: Date;
  }): Promise<BasesLocalesCreationDto[]> {
    const filter: FilterQuery<BaseLocale> = {
      _created: {
        $gte: dates.from,
        $lte: dates.to,
      },
    };
    const bals = await this.baseLocaleService.findMany(filter);
    const balsGroupByDays: Record<string, BaseLocale> = groupBy(bals, (bal) =>
      format(bal._created, 'yyyy-MM-dd'),
    );
    return Object.entries(balsGroupByDays).map(([date, bals]) => {
      const balsGroupedByCommune = groupBy(bals, (bal) => bal.commune);
      return {
        date,
        createdBAL: mapValues(balsGroupedByCommune, (balsByCommune) => ({
          total: balsByCommune.length,
          published: balsByCommune.filter(
            ({ status }) => status === 'published',
          ).length,
          draft: balsByCommune.filter(({ status }) => status === 'draft')
            .length,
          readyToPublish: balsByCommune.filter(
            ({ status }) => status === 'ready-to-publish',
          ).length,
          demo: balsByCommune.filter(({ status }) => status === 'demo').length,
        })),
      };
    });
  }
}
