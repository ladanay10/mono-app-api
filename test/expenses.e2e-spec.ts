import { setupE2E, type E2EContext } from './support/e2e';

describe('expenses (e2e)', () => {
  let ctx: E2EContext;
  let bouquetId: string;

  beforeAll(async () => {
    ctx = await setupE2E();
    const b = await ctx
      .authed('post', '/api/bouquets')
      .send({ title: 'Витрати' })
      .expect(201);
    bouquetId = b.body.id;
  });
  afterAll(() => ctx.close());

  it('BOUQUET expense requires a bouquetId (400)', () =>
    ctx
      .authed('post', '/api/expenses')
      .send({
        scope: 'BOUQUET',
        kind: 'PACKAGING',
        amountKopiyky: 1000,
        incurredOn: '2026-07-08',
      })
      .expect(400));

  it('GENERAL expense must NOT carry a bouquetId (400)', () =>
    ctx
      .authed('post', '/api/expenses')
      .send({
        scope: 'GENERAL',
        bouquetId,
        kind: 'RENT',
        amountKopiyky: 1000,
        incurredOn: '2026-07-08',
      })
      .expect(400));

  it('BOUQUET expense with an unknown bouquet (404)', () =>
    ctx
      .authed('post', '/api/expenses')
      .send({
        scope: 'BOUQUET',
        bouquetId: '00000000-0000-0000-0000-000000000000',
        kind: 'PACKAGING',
        amountKopiyky: 1000,
        incurredOn: '2026-07-08',
      })
      .expect(404));

  it('rejects a bad date format (400)', () =>
    ctx
      .authed('post', '/api/expenses')
      .send({
        scope: 'GENERAL',
        kind: 'RENT',
        amountKopiyky: 1000,
        incurredOn: '08.07.2026',
      })
      .expect(400));

  it('creates a GENERAL expense and deletes it', async () => {
    const res = await ctx
      .authed('post', '/api/expenses')
      .send({
        scope: 'GENERAL',
        kind: 'MARKETING',
        amountKopiyky: 8000,
        incurredOn: '2026-07-08',
        description: 'реклама',
      })
      .expect(201);
    await ctx.authed('delete', `/api/expenses/${res.body.id}`).expect(204);
  });
});
