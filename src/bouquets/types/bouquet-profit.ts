// Shape of the bouquet_profit VIEW (see migration 0001), normalised to numbers.
// pg returns bigint columns as strings, so every money field is coerced.
export interface BouquetProfit {
  bouquetId: string;
  linesSaleTotalKopiyky: number;
  flowersCostKopiyky: number;
  bouquetExpensesKopiyky: number;
  revenueKopiyky: number; // БРУДНИЙ ДОХІД
  grossMarginKopiyky: number; // навар із квітів
  netProfitKopiyky: number; // ЧИСТИЙ ДОХІД
  marginBps: number | null;
}

function toNum(v: unknown): number {
  return v === null || v === undefined ? 0 : Number(v);
}

export function mapBouquetProfit(r: Record<string, unknown>): BouquetProfit {
  return {
    bouquetId: String(r.bouquet_id),
    linesSaleTotalKopiyky: toNum(r.lines_sale_total_kopiyky),
    flowersCostKopiyky: toNum(r.flowers_cost_kopiyky),
    bouquetExpensesKopiyky: toNum(r.bouquet_expenses_kopiyky),
    revenueKopiyky: toNum(r.revenue_kopiyky),
    grossMarginKopiyky: toNum(r.gross_margin_kopiyky),
    netProfitKopiyky: toNum(r.net_profit_kopiyky),
    marginBps: r.margin_bps == null ? null : Number(r.margin_bps),
  };
}
