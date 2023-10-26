import { Module, forwardRef } from '@nestjs/common';
import { ToponymeController } from './toponyme.controller';
import { DbModule } from '@/lib/db/db.module';
import { ToponymeService } from './toponyme.service';
import { NumeroModule } from '../numeros/numero.module';

@Module({
  imports: [DbModule, forwardRef(() => NumeroModule)],
  providers: [ToponymeService],
  controllers: [ToponymeController],
  exports: [ToponymeService],
})
export class ToponymeModule {}
