-- Custom SQL migration file, put your code below! --

-- Profit model change: bouquet expenses (packaging, delivery, …) are paid by the
-- client, so they are ADDED into revenue (БРУДНИЙ ДОХІД = уся сума за букет).
-- Effect: expenses no longer eat the flower margin — they pass through.
--   revenue     = charged price − discount + bouquet_expenses
--   net_profit  = revenue − flowers_cost − bouquet_expenses  (= flower margin − discount)
-- Only the revenue_kopiyky expression changes; the column shape is identical, so
-- CREATE OR REPLACE keeps every reader (bouquet detail + reports) in sync.
CREATE OR REPLACE VIEW "bouquet_profit" AS
SELECT
  base.bouquet_id,
  base.lines_sale_total_kopiyky,
  base.flowers_cost_kopiyky,
  base.bouquet_expenses_kopiyky,
  base.revenue_kopiyky,
  (base.revenue_kopiyky - base.flowers_cost_kopiyky) AS gross_margin_kopiyky,
  (base.revenue_kopiyky - base.flowers_cost_kopiyky - base.bouquet_expenses_kopiyky) AS net_profit_kopiyky,
  CASE
    WHEN base.revenue_kopiyky <> 0
    THEN round(
      ((base.revenue_kopiyky - base.flowers_cost_kopiyky - base.bouquet_expenses_kopiyky)::numeric * 10000)
      / base.revenue_kopiyky
    )::int
    ELSE NULL
  END AS margin_bps
FROM (
  SELECT
    b.id AS bouquet_id,
    COALESCE(la.lines_sale_total_kopiyky, 0)::bigint AS lines_sale_total_kopiyky,
    COALESCE(la.flowers_cost_kopiyky, 0)::bigint AS flowers_cost_kopiyky,
    COALESCE(ea.bouquet_expenses_kopiyky, 0)::bigint AS bouquet_expenses_kopiyky,
    -- revenue = charged price (fallback Σ line sale) − discount + bouquet expenses
    (COALESCE(b.sale_price_kopiyky, COALESCE(la.lines_sale_total_kopiyky, 0))
      - b.discount_kopiyky
      + COALESCE(ea.bouquet_expenses_kopiyky, 0))::bigint
      AS revenue_kopiyky
  FROM "bouquets" b
  LEFT JOIN (
    SELECT
      bl.bouquet_id,
      SUM(round(bl.unit_sale_price_kopiyky * bl.quantity))::bigint AS lines_sale_total_kopiyky,
      SUM(round(bl.unit_purchase_price_kopiyky * bl.quantity))::bigint AS flowers_cost_kopiyky
    FROM "bouquet_lines" bl
    GROUP BY bl.bouquet_id
  ) la ON la.bouquet_id = b.id
  LEFT JOIN (
    SELECT e.bouquet_id, SUM(e.amount_kopiyky)::bigint AS bouquet_expenses_kopiyky
    FROM "expenses" e
    WHERE e.scope = 'BOUQUET'
    GROUP BY e.bouquet_id
  ) ea ON ea.bouquet_id = b.id
) base;
