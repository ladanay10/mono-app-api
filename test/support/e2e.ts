import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { OWNER, resetDatabase, setTestEnv } from './database';

export type HttpMethod = 'get' | 'post' | 'patch' | 'delete';

export interface E2EContext {
  app: INestApplication;
  token: string;
  /** A fresh unauthenticated request agent. */
  api: () => ReturnType<typeof request>;
  /** A request pre-authenticated as the seeded OWNER. */
  authed: (method: HttpMethod, url: string) => request.Test;
  close: () => Promise<void>;
}

// Boot the real AppModule (same global config as main.ts) against a freshly
// reset test DB, and log in as the OWNER. One call per e2e file.
export async function setupE2E(): Promise<E2EContext> {
  setTestEnv();
  await resetDatabase();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  const api = () => request(app.getHttpServer());
  const login = await api()
    .post('/api/auth/login')
    .send({ email: OWNER.email, password: OWNER.password });
  const token = login.body.accessToken as string;
  const authed = (method: HttpMethod, url: string) =>
    api()[method](url).set('Authorization', `Bearer ${token}`);

  return { app, token, api, authed, close: () => app.close() };
}
