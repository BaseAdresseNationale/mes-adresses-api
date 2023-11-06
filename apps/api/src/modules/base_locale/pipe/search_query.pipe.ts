import {
  PipeTransform,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FilterQuery } from 'mongoose';

import { BaseLocale } from '@/shared/schemas/base_locale/base_locale.schema';
import { getCommune } from '@/shared/utils/cog.utils';

import { checkValidEmail } from '@/modules/base_locale/utils/base_locale.utils';

export type SearchQueryTransformed = {
  offset: number;
  limit: number;
  filters: FilterQuery<BaseLocale>;
};

@Injectable()
export class SearchQueryPipe implements PipeTransform {
  transform(query: any): SearchQueryTransformed {
    const limit = query.limit ? Number.parseInt(query.limit, 10) : 20;
    const offset = query.offset ? Number.parseInt(query.offset, 10) : 0;
    const filters: FilterQuery<BaseLocale> = {};

    if (!Number.isInteger(limit) || limit > 100 || limit <= 0) {
      throw new HttpException(
        'La valeur du champ "limit" doit un entier compris en 1 et 100 (défaut : 20)',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!Number.isInteger(offset) || offset < 0) {
      throw new HttpException(
        'La valeur du champ "offset" doit être un entier positif (défaut : 0)',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (query.deleted) {
      if (query.deleted === 'false') {
        filters._deleted = { $eq: null };
      } else if (query.deleted === 'true') {
        filters._deleted = { $ne: null };
      } else {
        throw new HttpException(
          'La valeur du champ "deleted" est invalide',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (query.commune) {
      if (typeof query.commune === 'string' && getCommune(query.commune)) {
        filters.commune = { $eq: query.commune };
      } else {
        throw new HttpException(
          'La valeur du champ "commune" est invalide',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (query.email) {
      if (typeof query.email === 'string' && checkValidEmail(query.email)) {
        filters.emails = { $eq: query.email };
      } else {
        throw new HttpException(
          'La valeur du champ "email" est invalide',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (query.status) {
      if (
        typeof query.status === 'string' &&
        ['demo', 'draft', 'ready-to-publish', 'published', 'replaced'].includes(
          query.status,
        )
      ) {
        filters.status = { $eq: query.status };
      } else {
        throw new HttpException(
          'La valeur du champ "status" est invalide',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return { offset, limit, filters };
  }
}
