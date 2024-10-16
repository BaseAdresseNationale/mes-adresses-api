import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { ApiModule } from './api.module';
import { WinstonLogger } from '@/shared/modules/logger/logger.service';
import { Logger } from '@/shared/utils/logger.utils';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule, {
    cors: true,
    logger: new WinstonLogger(Logger),
  });

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

  await app.listen(process.env.PORT || 5000);
}
bootstrap();
