import { Injectable } from '@nestjs/common';
import { Numeros } from './numeros.schema'

@Injectable()
export class NumerosService {

  filterSensitiveFields(numero: Numeros) {
    numero.comment = null
  }
}
