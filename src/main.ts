import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import * as express from 'express';
import * as cors from 'cors';
import * as morgan from 'morgan';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';

import * as apiLegacy from '../legacy-api/routes';
import * as mongo from '../legacy-api/util/mongo';
// import { prepareContoursCommunes } from '../legacy-api/util/contours-communes';

const getLegacyExpressApp = async () => {
  const expressApp = express();
  expressApp.use(cors({ origin: true }));
  if (process.env.NODE_ENV !== 'production') {
    expressApp.use(morgan('dev'));
  }
  await mongo.connect();

  // await prepareContoursCommunes();

  expressApp.use('/public', express.static('public'));
  expressApp.use('/v1', apiLegacy);

  return expressApp;
};

async function bootstrap() {
  const expressApp = await getLegacyExpressApp();
  const adapter = new ExpressAdapter(expressApp);

  const app = await NestFactory.create(AppModule, adapter);

  const config = new DocumentBuilder()
    .setTitle('Mes adresses API')
    .setDescription('Mes adresses API description')
    .setVersion('1.0')
    .build();
  app.useGlobalPipes(new ValidationPipe());
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT || 5000);
}
bootstrap();
