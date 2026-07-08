import { setupE2E, type E2EContext } from './support/e2e';

describe('reports (e2e)', () => {
  let ctx: E2EContext;

  beforeAll(async () => {
    ctx = await setupE2E();
    // One SOLD bouquet so the period reports have something to aggregate.
    const c = await ctx
      .authed('post', '/api/catalog')
      .send({
        name: 'rep',
        kind: 'FLOWER',
        unit: 'PIECE',
        purchasePriceKopiyky: 1000,
        salePriceKopiyky: 3000,
      })
      .expect(201);
    const b = await ctx
      .authed('post', '/api/bouquets')
      .send({ title: 'Звіт' })
      .expect(201);
    await ctx
      .authed('post', `/api/bouquets/${b.body.id}/lines`)
      .send({ catalogItemId: c.body.id, quantity: 2 })
      .expect(201);
    await ctx
      .authed('post', `/api/bouquets/${b.body.id}/sell`)
      .send({ soldOn: '2026-07-08' })
      .expect(200);
  });
  afterAll(() => ctx.close());

  it('summary is internally consistent (net = gross − costs)', async () => {
    const res = await ctx
      .authed('get', '/api/reports/summary?from=2026-07-01&to=2026-07-31')
      .expect(200);
    const b = res.body;
    expect(b.soldCount).toBeGreaterThanOrEqual(1);
    // Bouquet add-ons stay in profit; only flowers cost + general expenses subtract.
    expect(b.netProfitKopiyky).toBe(
      b.grossRevenueKopiyky - b.flowersCostKopiyky - b.generalExpensesKopiyky,
    );
  });

  it('summary rejects a malformed date (400)', () =>
    ctx.authed('get', '/api/reports/summary?from=julyfirst').expect(400));

  it('monthly returns rows for the year', async () => {
    const res = await ctx
      .authed('get', '/api/reports/monthly?year=2026')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('monthly rejects a bad year (400)', () =>
    ctx.authed('get', '/api/reports/monthly?year=abcd').expect(400));

  it('top-flowers returns an array', async () => {
    const res = await ctx
      .authed(
        'get',
        '/api/reports/top-flowers?from=2026-07-01&to=2026-07-31&limit=5',
      )
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('outstanding reports debt against the full revenue (incl. expenses)', async () => {
    const c = await ctx
      .authed('post', '/api/catalog')
      .send({
        name: 'debt',
        kind: 'FLOWER',
        unit: 'PIECE',
        purchasePriceKopiyky: 1000,
        salePriceKopiyky: 10000,
      })
      .expect(201);
    const b = await ctx
      .authed('post', '/api/bouquets')
      .send({ title: 'Борг' })
      .expect(201);
    await ctx
      .authed('post', `/api/bouquets/${b.body.id}/lines`)
      .send({ catalogItemId: c.body.id, quantity: 1 })
      .expect(201);
    await ctx
      .authed('post', '/api/expenses')
      .send({
        scope: 'BOUQUET',
        bouquetId: b.body.id,
        kind: 'PACKAGING',
        amountKopiyky: 5000,
        incurredOn: '2026-07-08',
      })
      .expect(201);
    // revenue = 10000 + 5000 = 15000; client pays only 6000 → owes 9000
    await ctx
      .authed('post', `/api/bouquets/${b.body.id}/sell`)
      .send({ soldOn: '2026-07-08', amountReceivedKopiyky: 6000 })
      .expect(200);
    const res = await ctx.authed('get', '/api/reports/outstanding').expect(200);
    const row = res.body.bouquets.find(
      (x: { id: string }) => x.id === b.body.id,
    );
    expect(row).toBeDefined();
    expect(row.owedKopiyky).toBe(9000);
  });
});
