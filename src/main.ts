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
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // CORS_ORIGIN="*" allows any origin (the request origin is reflected back so
  // credentials still work); otherwise only the listed origins are allowed.
  const allowedOrigins = config.env.CORS_ORIGIN;
  app.enableCors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: true,
  });

  await app.listen(config.env.PORT);

  console.log(
    `mono-reports-api listening on http://localhost:${config.env.PORT}/api`,
  );
}
void bootstrap();
