import { setupE2E, type E2EContext } from './support/e2e';

describe('catalog (e2e)', () => {
  let ctx: E2EContext;
  let itemId: string;

  beforeAll(async () => {
    ctx = await setupE2E();
  });
  afterAll(() => ctx.close());

  it('creates an item with the single PIECE unit', async () => {
    const res = await ctx
      .authed('post', '/api/catalog')
      .send({
        name: 'Троянда Freedom',
        kind: 'FLOWER',
        unit: 'PIECE',
        category: 'Троянди',
        purchasePriceKopiyky: 3000,
        salePriceKopiyky: 6000,
      })
      .expect(201);
    expect(res.body.unit).toBe('PIECE');
    expect(res.body.isActive).toBe(true);
    itemId = res.body.id;
  });

  it('rejects a non-PIECE unit (enum collapsed) (400)', () =>
    ctx
      .authed('post', '/api/catalog')
      .send({
        name: 'x',
        kind: 'FLOWER',
        unit: 'STEM',
        purchasePriceKopiyky: 1,
        salePriceKopiyky: 2,
      })
      .expect(400));

  it('rejects a negative price (400)', () =>
    ctx
      .authed('post', '/api/catalog')
      .send({
        name: 'x',
        kind: 'FLOWER',
        unit: 'PIECE',
        purchasePriceKopiyky: -1,
        salePriceKopiyky: 2,
      })
      .expect(400));

  it('rejects an unknown extra field (whitelist) (400)', () =>
    ctx
      .authed('post', '/api/catalog')
      .send({
        name: 'x',
        kind: 'FLOWER',
        unit: 'PIECE',
        purchasePriceKopiyky: 1,
        salePriceKopiyky: 2,
        hacker: true,
      })
      .expect(400));

  it('gets the item by id', async () => {
    const res = await ctx.authed('get', `/api/catalog/${itemId}`).expect(200);
    expect(res.body.name).toBe('Троянда Freedom');
  });

  it('returns 404 for an unknown id', () =>
    ctx
      .authed('get', '/api/catalog/00000000-0000-0000-0000-000000000000')
      .expect(404));

  it('returns 400 for a malformed uuid', () =>
    ctx.authed('get', '/api/catalog/not-a-uuid').expect(400));

  it('updates the item', async () => {
    const res = await ctx
      .authed('patch', `/api/catalog/${itemId}`)
      .send({ salePriceKopiyky: 7000 })
      .expect(200);
    expect(res.body.salePriceKopiyky).toBe(7000);
  });

  it('archives (soft-delete) and hides it from the default list', async () => {
    await ctx.authed('delete', `/api/catalog/${itemId}`).expect(200);
    const list = await ctx.authed('get', '/api/catalog').expect(200);
    expect(
      list.body.find((i: { id: string }) => i.id === itemId),
    ).toBeUndefined();
    const all = await ctx
      .authed('get', '/api/catalog?includeInactive=true')
      .expect(200);
    expect(
      all.body.find((i: { id: string }) => i.id === itemId)?.isActive,
    ).toBe(false);
  });
});
