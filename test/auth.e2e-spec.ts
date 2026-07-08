import { OWNER } from './support/database';
import { setupE2E, type E2EContext } from './support/e2e';

describe('auth (e2e)', () => {
  let ctx: E2EContext;

  beforeAll(async () => {
    ctx = await setupE2E();
  });
  afterAll(() => ctx.close());

  it('health is public', () =>
    ctx
      .api()
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', service: 'mono-reports-api' }));

  it('login returns a token and the user (no password hash)', async () => {
    const res = await ctx
      .api()
      .post('/api/auth/login')
      .send({ email: OWNER.email, password: OWNER.password })
      .expect(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.user).toMatchObject({ email: OWNER.email, role: 'OWNER' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a wrong password (401)', () =>
    ctx
      .api()
      .post('/api/auth/login')
      .send({ email: OWNER.email, password: 'nope-wrong-pass' })
      .expect(401));

  it('rejects an unknown email (401)', () =>
    ctx
      .api()
      .post('/api/auth/login')
      .send({ email: 'ghost@test.local', password: 'whatever123' })
      .expect(401));

  it('blocks a protected route without a token (401)', () =>
    ctx.api().get('/api/catalog').expect(401));

  it('blocks a forged/garbage token (401)', () =>
    ctx
      .api()
      .get('/api/catalog')
      .set('Authorization', 'Bearer not.a.real.jwt')
      .expect(401));

  it('/auth/me returns the current user', async () => {
    const res = await ctx.authed('get', '/api/auth/me').expect(200);
    expect(res.body).toMatchObject({ email: OWNER.email, role: 'OWNER' });
  });
});
