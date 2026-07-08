import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/drizzle';

function num(v: unknown): number {
  return v === null || v === undefined ? 0 : Number(v);
}

function todayKyiv(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv' }).format(new Date());
}

function firstOfMonthKyiv(): string {
  return `${todayKyiv().slice(0, 7)}-01`;
}

@Injectable()
export class ReportsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // Period P&L over SOLD bouquets (by sold_on) + GENERAL expenses (by incurred_on).
  async summary(from?: string, to?: string) {
    const f = from ?? firstOfMonthKyiv();
    const t = to ?? todayKyiv();
    const res = await this.db.execute(sql`
      WITH sold AS (
        SELECT p.revenue_kopiyky, p.flowers_cost_kopiyky, p.bouquet_expenses_kopiyky,
               b.amount_received_kopiyky
        FROM bouquets b
        JOIN bouquet_profit p ON p.bouquet_id = b.id
        WHERE b.status = 'SOLD' AND b.sold_on BETWEEN ${f} AND ${t}
      )
      SELECT
        (SELECT COUNT(*) FROM sold) AS sold_count,
        COALESCE((SELECT SUM(revenue_kopiyky) FROM sold), 0) AS gross_revenue,
        COALESCE((SELECT SUM(flowers_cost_kopiyky) FROM sold), 0) AS flowers_cost,
        COALESCE((SELECT SUM(bouquet_expenses_kopiyky) FROM sold), 0) AS bouquet_expenses,
        COALESCE((SELECT SUM(amount_received_kopiyky) FROM sold), 0) AS cash_received,
        COALESCE((SELECT SUM(amount_kopiyky) FROM expenses
                  WHERE scope = 'GENERAL' AND incurred_on BETWEEN ${f} AND ${t}), 0) AS general_expenses
    `);
    const r = (res.rows as Record<string, unknown>[])[0] ?? {};
    const grossRevenue = num(r.gross_revenue);
    const flowersCost = num(r.flowers_cost);
    const bouquetExpenses = num(r.bouquet_expenses);
    const generalExpenses = num(r.general_expenses);
    return {
      from: f,
      to: t,
      soldCount: num(r.sold_count),
      grossRevenueKopiyky: grossRevenue, // брудний дохід
      flowersCostKopiyky: flowersCost,
      bouquetExpensesKopiyky: bouquetExpenses,
      generalExpensesKopiyky: generalExpenses,
      netProfitKopiyky: grossRevenue - flowersCost - bouquetExpenses - generalExpenses, // чистий
      cashReceivedKopiyky: num(r.cash_received),
    };
  }

  // Per-month gross/net for a year.
  async monthly(year?: number) {
    const y = year ?? Number(todayKyiv().slice(0, 4));
    const res = await this.db.execute(sql`
      WITH m AS (
        SELECT to_char(b.sold_on, 'YYYY-MM') AS month,
               COUNT(*) AS sold_count,
               SUM(p.revenue_kopiyky) AS gross_revenue,
               SUM(p.flowers_cost_kopiyky) AS flowers_cost,
               SUM(p.bouquet_expenses_kopiyky) AS bouquet_expenses
        FROM bouquets b
        JOIN bouquet_profit p ON p.bouquet_id = b.id
        WHERE b.status = 'SOLD' AND date_part('year', b.sold_on) = ${y}
        GROUP BY 1
      ),
      g AS (
        SELECT to_char(incurred_on, 'YYYY-MM') AS month, SUM(amount_kopiyky) AS general_expenses
        FROM expenses
        WHERE scope = 'GENERAL' AND date_part('year', incurred_on) = ${y}
        GROUP BY 1
      )
      SELECT
        COALESCE(m.month, g.month) AS month,
        COALESCE(m.sold_count, 0) AS sold_count,
        COALESCE(m.gross_revenue, 0) AS gross_revenue,
        COALESCE(m.flowers_cost, 0) AS flowers_cost,
        COALESCE(m.bouquet_expenses, 0) AS bouquet_expenses,
        COALESCE(g.general_expenses, 0) AS general_expenses
      FROM m FULL OUTER JOIN g ON m.month = g.month
      ORDER BY 1
    `);
    return (res.rows as Record<string, unknown>[]).map((r) => {
      const grossRevenue = num(r.gross_revenue);
      const flowersCost = num(r.flowers_cost);
      const bouquetExpenses = num(r.bouquet_expenses);
      const generalExpenses = num(r.general_expenses);
      return {
        month: String(r.month),
        soldCount: num(r.sold_count),
        grossRevenueKopiyky: grossRevenue,
        flowersCostKopiyky: flowersCost,
        bouquetExpensesKopiyky: bouquetExpenses,
        generalExpensesKopiyky: generalExpenses,
        netProfitKopiyky: grossRevenue - flowersCost - bouquetExpenses - generalExpenses,
      };
    });
  }

  // Most-used / most-profitable flowers across SOLD bouquets in a period.
  async topFlowers(from?: string, to?: string, limit = 20) {
    const f = from ?? firstOfMonthKyiv();
    const t = to ?? todayKyiv();
    const res = await this.db.execute(sql`
      SELECT
        bl.catalog_item_id,
        bl.item_name_snapshot AS name,
        bl.unit_snapshot AS unit,
        SUM(bl.quantity) AS total_quantity,
        COUNT(*) AS times_used,
        SUM(round(bl.unit_purchase_price_kopiyky * bl.quantity)) AS total_cost,
        SUM(round(bl.unit_sale_price_kopiyky * bl.quantity)) AS total_revenue,
        SUM(round(bl.unit_sale_price_kopiyky * bl.quantity)
            - round(bl.unit_purchase_price_kopiyky * bl.quantity)) AS total_margin
      FROM bouquet_lines bl
      JOIN bouquets b ON b.id = bl.bouquet_id
      WHERE b.status = 'SOLD' AND b.sold_on BETWEEN ${f} AND ${t}
      GROUP BY bl.catalog_item_id, bl.item_name_snapshot, bl.unit_snapshot
      ORDER BY total_margin DESC
      LIMIT ${limit}
    `);
    return (res.rows as Record<string, unknown>[]).map((r) => ({
      catalogItemId: r.catalog_item_id ? String(r.catalog_item_id) : null,
      name: String(r.name),
      unit: String(r.unit),
      totalQuantity: num(r.total_quantity),
      timesUsed: num(r.times_used),
      totalCostKopiyky: num(r.total_cost),
      totalRevenueKopiyky: num(r.total_revenue),
      totalMarginKopiyky: num(r.total_margin),
    }));
  }

  // SOLD bouquets not yet fully paid.
  async outstanding() {
    const res = await this.db.execute(sql`
      SELECT b.id, b.title, b.sold_on, b.sale_price_kopiyky, b.discount_kopiyky, b.amount_received_kopiyky,
             (COALESCE(b.sale_price_kopiyky, 0) - b.discount_kopiyky - b.amount_received_kopiyky) AS owed
      FROM bouquets b
      WHERE b.status = 'SOLD'
        AND (COALESCE(b.sale_price_kopiyky, 0) - b.discount_kopiyky) > b.amount_received_kopiyky
      ORDER BY owed DESC
    `);
    const rows = (res.rows as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      title: r.title ? String(r.title) : null,
      soldOn: r.sold_on ? String(r.sold_on) : null,
      salePriceKopiyky: num(r.sale_price_kopiyky),
      discountKopiyky: num(r.discount_kopiyky),
      amountReceivedKopiyky: num(r.amount_received_kopiyky),
      owedKopiyky: num(r.owed),
    }));
    return {
      count: rows.length,
      outstandingKopiyky: rows.reduce((s, x) => s + x.owedKopiyky, 0),
      bouquets: rows,
    };
  }
}
