import { setupE2E, type E2EContext } from './support/e2e';

describe('recipes (e2e)', () => {
  let ctx: E2EContext;
  let catId: string;
  let recipeId: string;

  beforeAll(async () => {
    ctx = await setupE2E();
    const c = await ctx
      .authed('post', '/api/catalog')
      .send({
        name: 'Троянда',
        kind: 'FLOWER',
        unit: 'PIECE',
        purchasePriceKopiyky: 1000,
        salePriceKopiyky: 2000,
      })
      .expect(201);
    catId = c.body.id;
  });
  afterAll(() => ctx.close());

  it('rejects saving an empty bouquet as a template (400)', async () => {
    const b = await ctx
      .authed('post', '/api/bouquets')
      .send({ title: 'Порожній' })
      .expect(201);
    await ctx
      .authed('post', '/api/recipes/from-bouquet')
      .send({ bouquetId: b.body.id, name: 'Пустий шаблон' })
      .expect(400);
  });

  it('saves a bouquet composition as a template', async () => {
    const b = await ctx
      .authed('post', '/api/bouquets')
      .send({ title: 'Класика' })
      .expect(201);
    await ctx
      .authed('post', `/api/bouquets/${b.body.id}/lines`)
      .send({ catalogItemId: catId, quantity: 5 })
      .expect(201);
    const res = await ctx
      .authed('post', '/api/recipes/from-bouquet')
      .send({
        bouquetId: b.body.id,
        name: 'Класичний букет',
        notes: '5 троянд',
      })
      .expect(201);
    expect(res.body.name).toBe('Класичний букет');
    expect(res.body.lines).toHaveLength(1);
    expect(res.body.lines[0].catalogItemId).toBe(catId);
    recipeId = res.body.id;
  });

  it('lists templates', async () => {
    const res = await ctx.authed('get', '/api/recipes').expect(200);
    expect(
      res.body.find((r: { id: string }) => r.id === recipeId),
    ).toBeDefined();
  });

  it('instantiates a template into a fresh DRAFT bouquet with CURRENT catalog prices', async () => {
    // Raise the catalog price after the template was saved.
    await ctx
      .authed('patch', `/api/catalog/${catId}`)
      .send({ salePriceKopiyky: 3000 })
      .expect(200);

    const res = await ctx
      .authed('post', `/api/recipes/${recipeId}/use`)
      .expect(201);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.title).toBe('Класичний букет');
    expect(res.body.lines).toHaveLength(1);
    expect(res.body.lines[0].quantity).toBe(5);
    // Re-pulled the CURRENT price (3000), not the template snapshot (2000).
    expect(res.body.lines[0].unitSalePriceKopiyky).toBe(3000);
  });

  it('deletes a template', async () => {
    await ctx.authed('delete', `/api/recipes/${recipeId}`).expect(204);
    await ctx.authed('get', `/api/recipes/${recipeId}`).expect(404);
  });
});
