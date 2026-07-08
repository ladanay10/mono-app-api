import { setupE2E, type E2EContext } from './support/e2e';

describe('bouquets (e2e)', () => {
  let ctx: E2EContext;

  beforeAll(async () => {
    ctx = await setupE2E();
  });
  afterAll(() => ctx.close());

  describe('compose, profit, provenance', () => {
    let catId: string;
    let bouquetId: string;

    beforeAll(async () => {
      const res = await ctx
        .authed('post', '/api/catalog')
        .send({
          name: 'тест',
          kind: 'FLOWER',
          unit: 'PIECE',
          purchasePriceKopiyky: 1000,
          salePriceKopiyky: 2000,
        })
        .expect(201);
      catId = res.body.id;
    });

    it('creates a DRAFT bouquet', async () => {
      const res = await ctx
        .authed('post', '/api/bouquets')
        .send({ title: 'Профіт' })
        .expect(201);
      expect(res.body.status).toBe('DRAFT');
      bouquetId = res.body.id;
    });

    it('adds a catalog line, snapshotting the price', async () => {
      const res = await ctx
        .authed('post', `/api/bouquets/${bouquetId}/lines`)
        .send({ catalogItemId: catId, quantity: 11 })
        .expect(201);
      const line = res.body.lines[0];
      expect(line.unitSalePriceKopiyky).toBe(2000);
      expect(line.unitSnapshot).toBe('PIECE');
      expect(line.lineCostKopiyky).toBe(11000);
      expect(line.lineRevenueKopiyky).toBe(22000);
    });

    it('packaging add-on is 100% profit (added to revenue and net)', async () => {
      await ctx
        .authed('post', '/api/expenses')
        .send({
          scope: 'BOUQUET',
          bouquetId,
          kind: 'PACKAGING',
          amountKopiyky: 15000,
          incurredOn: '2026-07-08',
        })
        .expect(201);
      const res = await ctx
        .authed('get', `/api/bouquets/${bouquetId}`)
        .expect(200);
      const p = res.body.profit;
      expect(p.flowersCostKopiyky).toBe(11000);
      expect(p.bouquetExpensesKopiyky).toBe(15000);
      expect(p.revenueKopiyky).toBe(37000); // 22000 flowers + 15000 packaging
      expect(p.netProfitKopiyky).toBe(26000); // 37000 − 11000 (packaging kept in profit)
      expect(p.marginBps).toBe(7027);
    });

    it('keeps line snapshots frozen when the catalog price later changes (provenance)', async () => {
      await ctx
        .authed('patch', `/api/catalog/${catId}`)
        .send({ salePriceKopiyky: 999999 })
        .expect(200);
      const res = await ctx
        .authed('get', `/api/bouquets/${bouquetId}`)
        .expect(200);
      expect(res.body.lines[0].unitSalePriceKopiyky).toBe(2000); // unchanged
    });

    it('adds an ad-hoc custom line (PIECE)', async () => {
      const res = await ctx
        .authed('post', `/api/bouquets/${bouquetId}/lines`)
        .send({
          itemName: 'Ринкова півонія',
          unit: 'PIECE',
          purchasePriceKopiyky: 5000,
          salePriceKopiyky: 9000,
          quantity: 2,
        })
        .expect(201);
      expect(res.body.lines).toHaveLength(2);
    });

    it('rejects an ad-hoc line missing prices (400)', () =>
      ctx
        .authed('post', `/api/bouquets/${bouquetId}/lines`)
        .send({ itemName: 'incomplete', quantity: 1 })
        .expect(400));
  });

  describe('sell, immutability, delete', () => {
    let catId: string;
    let bouquetId: string;

    beforeAll(async () => {
      const c = await ctx
        .authed('post', '/api/catalog')
        .send({
          name: 'life',
          kind: 'FLOWER',
          unit: 'PIECE',
          purchasePriceKopiyky: 1000,
          salePriceKopiyky: 3000,
        })
        .expect(201);
      catId = c.body.id;
      const b = await ctx
        .authed('post', '/api/bouquets')
        .send({ title: 'Життєвий цикл' })
        .expect(201);
      bouquetId = b.body.id;
      await ctx
        .authed('post', `/api/bouquets/${bouquetId}/lines`)
        .send({ catalogItemId: catId, quantity: 4 })
        .expect(201);
      await ctx
        .authed('post', '/api/expenses')
        .send({
          scope: 'BOUQUET',
          bouquetId,
          kind: 'DELIVERY',
          amountKopiyky: 5000,
          incurredOn: '2026-07-08',
        })
        .expect(201);
    });

    it('confirms the bouquet (snapshots the charged price)', async () => {
      const res = await ctx
        .authed('post', `/api/bouquets/${bouquetId}/confirm`)
        .expect(200);
      expect(res.body.status).toBe('CONFIRMED');
      expect(res.body.salePriceKopiyky).toBe(12000); // 4 * 3000 flowers
    });

    it('sells, defaulting cash received to the full revenue (incl. expenses)', async () => {
      const res = await ctx
        .authed('post', `/api/bouquets/${bouquetId}/sell`)
        .send({ soldOn: '2026-07-08' })
        .expect(200);
      expect(res.body.status).toBe('SOLD');
      expect(res.body.soldOn).toBe('2026-07-08');
      expect(res.body.amountReceivedKopiyky).toBe(17000); // 12000 flowers + 5000 delivery
    });

    it('freezes lines once SOLD — add line rejected (409)', () =>
      ctx
        .authed('post', `/api/bouquets/${bouquetId}/lines`)
        .send({ catalogItemId: catId, quantity: 1 })
        .expect(409));

    it('freezes lines once SOLD — delete bouquet rejected (409)', () =>
      ctx.authed('delete', `/api/bouquets/${bouquetId}`).expect(409));

    it('cannot cancel a SOLD bouquet (409)', () =>
      ctx.authed('post', `/api/bouquets/${bouquetId}/cancel`).expect(409));

    it('deletes a DRAFT even when it carries bouquet expenses (cascade)', async () => {
      const b = await ctx
        .authed('post', '/api/bouquets')
        .send({ title: 'Чернетка з витратами' })
        .expect(201);
      const draftId = b.body.id;
      await ctx
        .authed('post', `/api/bouquets/${draftId}/lines`)
        .send({ catalogItemId: catId, quantity: 1 })
        .expect(201);
      await ctx
        .authed('post', '/api/expenses')
        .send({
          scope: 'BOUQUET',
          bouquetId: draftId,
          kind: 'PACKAGING',
          amountKopiyky: 2500,
          incurredOn: '2026-07-08',
        })
        .expect(201);
      await ctx.authed('delete', `/api/bouquets/${draftId}`).expect(204);
      await ctx.authed('get', `/api/bouquets/${draftId}`).expect(404);
      const list = await ctx
        .authed('get', `/api/expenses?bouquetId=${draftId}`)
        .expect(200);
      expect(list.body).toHaveLength(0);
    });

    it('clones a bouquet into a fresh DRAFT with the same lines', async () => {
      const res = await ctx
        .authed('post', `/api/bouquets/${bouquetId}/clone`)
        .expect(201);
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.lines).toHaveLength(1);
      expect(res.body.title).toContain('копія');
    });
  });
});
