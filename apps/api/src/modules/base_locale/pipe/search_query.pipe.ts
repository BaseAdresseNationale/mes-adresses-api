import {
  PipeTransform,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FindOptionsWhere, Not } from 'typeorm';

import {
  BaseLocale,
  StatusBaseLocalEnum,
} from '@/shared/entities/base_locale.entity';
import { getCommune } from '@/shared/utils/cog.utils';

import { checkValidEmail } from '@/modules/base_locale/utils/base_locale.utils';
import { SearchBaseLocalQuery } from '../dto/search_base_locale.query';

export type SearchQueryTransformed = {
  offset: number;
  limit: number;
  filters: FindOptionsWhere<BaseLocale>;
  email?: string;
};

@Injectable()
export class SearchQueryPipe implements PipeTransform {
  transform(query: SearchBaseLocalQuery): SearchQueryTransformed {
    const res: SearchQueryTransformed = {
      limit: query.limit ? Number.parseInt(query.limit, 10) : 20,
      offset: query.offset ? Number.parseInt(query.offset, 10) : 0,
      filters: {},
    };

    if (!Number.isInteger(res.limit) || res.limit > 100 || res.limit <= 0) {
      throw new HttpException(
        'La valeur du champ "limit" doit un entier compris en 1 et 100 (défaut : 20)',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!Number.isInteger(res.offset) || res.offset < 0) {
      throw new HttpException(
        'La valeur du champ "offset" doit être un entier positif (défaut : 0)',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (query.deleted === 'false') {
      res.filters.deletedAt = null;
    } else if (query.deleted === 'true') {
      res.filters.deletedAt = Not(null);
    } else if (query.deleted) {
      throw new HttpException(
        'La valeur du champ "deleted" est invalide',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (query.commune) {
      if (typeof query.commune === 'string' && getCommune(query.commune)) {
        res.filters.commune = query.commune;
      } else {
        throw new HttpException(
          'La valeur du champ "commune" est invalide',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (query.email) {
      if (typeof query.email === 'string' && checkValidEmail(query.email)) {
        res.email = query.email.toLowerCase();
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
        [
          StatusBaseLocalEnum.DEMO,
          StatusBaseLocalEnum.DRAFT,
          StatusBaseLocalEnum.PUBLISHED,
          StatusBaseLocalEnum.REPLACED,
        ].includes(query.status as StatusBaseLocalEnum)
      ) {
        res.filters.status = query.status as StatusBaseLocalEnum;
      } else {
        throw new HttpException(
          'La valeur du champ "status" est invalide',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return res;
  }
}
