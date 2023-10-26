import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { Habilitation } from './types/habilitation.type';
import { BaseLocale } from '../base_locale/schema/base_locale.schema';
import { BaseLocaleService } from '../base_locale/base_locale.service';

@Injectable()
export class TilesService {
  constructor() {}
}
