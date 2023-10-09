import { Injectable } from '@nestjs/common';
import { Numero } from './schema/numero.schema'

@Injectable()
export class NumeroService {

  filterSensitiveFields(numero: Numero) {
    numero.comment = null
  }
}
