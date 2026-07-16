import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AppConfig } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(AppConfig);

  // Behind the CDN/host proxy (Cloudflare → Fly). Lets Express derive the real
  // client from X-Forwarded-For, so the rate limiter keys on the visitor, not
  // the proxy. (The throttler also reads CF-Connecting-IP directly.)
  app.set('trust proxy', 1);

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
