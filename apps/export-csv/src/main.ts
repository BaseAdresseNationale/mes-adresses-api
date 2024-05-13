import { NestFactory } from '@nestjs/core';
import { ExportCsvModule } from './export-csv.module';
import { ExportCsvService } from './export-csv.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ExportCsvModule);
  const exportCsvService = app.get(ExportCsvService);
  console.log('START');
  // await exportCsvService.exportCsvs();
  await exportCsvService.test();
  console.log('END');
  await app.close();
}

bootstrap();
