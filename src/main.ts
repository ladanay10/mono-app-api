import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfig } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfig);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableCors({ origin: config.env.CORS_ORIGIN, credentials: true });

  await app.listen(config.env.PORT);
  // eslint-disable-next-line no-console
  console.log(`mono-reports-api listening on http://localhost:${config.env.PORT}/api`);
}
void bootstrap();
