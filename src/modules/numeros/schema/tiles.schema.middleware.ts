import { Injectable } from '@nestjs/common';
import { NumeroSchema } from './numero.schema';
import { TilesService } from '@/lib/services/tiles.service';

@Injectable()
export class TilesSchemaMiddleware {
  constructor(private tilesService: TilesService) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    console.log('TILE MIDDLEWARE SERVICE');
    // MIDDLEWARES
    NumeroSchema.pre('save', function () {
      console.log('PRE SAVE');
    });
    NumeroSchema.pre('findOneAndUpdate', function () {
      console.log('PRE findOneAndUpdate'); // Will not be executed
    });
    NumeroSchema.pre('updateOne', function () {
      self.triggerCalcTitle(this.getUpdate());
    });
  }

  private triggerCalcTitle(fieldsUpdated: Record<string, any>) {
    console.log('Updating', fieldsUpdated);
    if (fieldsUpdated.positions) {
      this.tilesService.calcMetaTilesNumero(fieldsUpdated);
      console.log('POSITIONS UPDATED');
    }
  }
}
