-- Custom SQL migration file, put your code below! --

-- Packaging (and other bouquet add-ons) are a 100%-margin markup the client pays
-- for — pure profit on the bouquet, NOT a per-bouquet cost. Their real supply
-- cost is tracked separately as GENERAL expenses (bought in bulk, monthly).
-- So net_profit no longer subtracts bouquet_expenses: it stays inside profit.
--   revenue     = charged price − discount + bouquet_add_ons   (unchanged)
--   net_profit  = revenue − flowers_cost                        (add-ons kept in)
CREATE OR REPLACE VIEW "bouquet_profit" AS
SELECT
  base.bouquet_id,
  base.lines_sale_total_kopiyky,
  base.flowers_cost_kopiyky,
  base.bouquet_expenses_kopiyky,
  base.revenue_kopiyky,
  (base.revenue_kopiyky - base.flowers_cost_kopiyky) AS gross_margin_kopiyky,
  (base.revenue_kopiyky - base.flowers_cost_kopiyky) AS net_profit_kopiyky,
  CASE
    WHEN base.revenue_kopiyky <> 0
    THEN round(
      ((base.revenue_kopiyky - base.flowers_cost_kopiyky)::numeric * 10000)
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
    -- revenue = charged price (fallback Σ line sale) − discount + bouquet add-ons
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
