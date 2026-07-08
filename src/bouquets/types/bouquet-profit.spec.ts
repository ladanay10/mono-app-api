import { mapBouquetProfit } from './bouquet-profit';

describe('mapBouquetProfit', () => {
  it('coerces bigint strings (as pg returns them) to numbers', () => {
    const p = mapBouquetProfit({
      bouquet_id: 'abc',
      lines_sale_total_kopiyky: '57500',
      flowers_cost_kopiyky: '30000',
      bouquet_expenses_kopiyky: '5000',
      revenue_kopiyky: '57500',
      gross_margin_kopiyky: '27500',
      net_profit_kopiyky: '22500',
      margin_bps: 3913,
    });
    expect(p.revenueKopiyky).toBe(57500);
    expect(p.flowersCostKopiyky).toBe(30000);
    expect(p.netProfitKopiyky).toBe(22500);
    expect(p.marginBps).toBe(3913);
  });

  it('handles null margin and missing fields as zero/null', () => {
    const p = mapBouquetProfit({ bouquet_id: 'x', margin_bps: null });
    expect(p.marginBps).toBeNull();
    expect(p.revenueKopiyky).toBe(0);
    expect(p.netProfitKopiyky).toBe(0);
  });
});
