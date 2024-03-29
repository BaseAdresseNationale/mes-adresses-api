import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as cors from 'cors';
import * as morgan from 'morgan';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import { printMemoryUsage } from './lib/utils/memory-usage.utils';

import { ApiModule } from './api.module';
import * as apiLegacy from '../../legacy-api/routes';
import * as mongo from '../../legacy-api/util/mongo';

const getLegacyExpressApp = async () => {
  const expressApp = express();
  expressApp.use(cors({ origin: true }));
  if (process.env.NODE_ENV !== 'production') {
    expressApp.use(morgan('dev'));
  }
  await mongo.connect();

  expressApp.use('/public', express.static('public'));
  expressApp.use('/v1', apiLegacy);

  return expressApp;
};

async function bootstrap() {
  const expressApp = await getLegacyExpressApp();
  const adapter = new ExpressAdapter(expressApp);

  const app = await NestFactory.create(ApiModule, adapter);

  const config = new DocumentBuilder()
    .setTitle('Mes adresses API')
    .setDescription(
      'API permettant la gestion de bases d’adresses à l’échelon local',
    )
    .setVersion('2.0')
    .addBearerAuth(
      {
        description: `Please enter the authentication token`,
        name: 'Authorization',
        type: 'http',
        in: 'Header',
      },
      'admin-token',
    )
    .build();
  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('v2');
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  if (process.env.PRINT_MEMORY_USAGE === 'true') {
    setInterval(printMemoryUsage, 1000);
  }

  await app.listen(process.env.PORT || 5000);
}
bootstrap();
