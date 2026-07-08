-- bouquet_profit: one consistent computed shape per bouquet. Nothing is stored.
-- Money math mirrors the app: round(price * quantity) HALF-UP once per line, then sum.
-- Terminology: revenue = БРУДНИЙ ДОХІД, net_profit = ЧИСТИЙ ДОХІД.
CREATE VIEW "bouquet_profit" AS
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
    -- revenue = charged price (fallback Σ line sale) − discount
    (COALESCE(b.sale_price_kopiyky, COALESCE(la.lines_sale_total_kopiyky, 0)) - b.discount_kopiyky)::bigint
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
--> statement-breakpoint
-- Provenance is non-negotiable, enforced here (not in the service layer):
--   INSERT/UPDATE of a line require a DRAFT parent.
--   DELETE of a line is allowed only when the parent is DRAFT, or already gone
--   (cascade from an allowed DRAFT-bouquet delete — non-DRAFT bouquet deletes are
--   blocked by enforce_bouquet_delete_only_draft below, so a NULL parent here is
--   always a legitimate DRAFT cascade).
CREATE OR REPLACE FUNCTION enforce_bouquet_line_immutability()
RETURNS trigger AS $$
DECLARE
  target_bouquet uuid;
  current_status bouquet_status;
BEGIN
  target_bouquet := COALESCE(NEW.bouquet_id, OLD.bouquet_id);
  SELECT status INTO current_status FROM bouquets WHERE id = target_bouquet;

  IF TG_OP = 'DELETE' THEN
    IF current_status IS NULL OR current_status = 'DRAFT' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'bouquet_lines are frozen once the bouquet is not DRAFT (bouquet %, status %)',
      target_bouquet, current_status USING ERRCODE = 'check_violation';
  END IF;

  IF current_status IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'bouquet_lines can only be added or changed while the bouquet is DRAFT (bouquet %, status %)',
      target_bouquet, current_status USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER bouquet_lines_immutability
BEFORE INSERT OR UPDATE OR DELETE ON "bouquet_lines"
FOR EACH ROW EXECUTE FUNCTION enforce_bouquet_line_immutability();
--> statement-breakpoint
-- A non-DRAFT bouquet is history: it cannot be deleted (cancel it instead).
-- This also guarantees any line cascade-delete comes from a DRAFT bouquet.
CREATE OR REPLACE FUNCTION enforce_bouquet_delete_only_draft()
RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'only DRAFT bouquets can be deleted (bouquet %, status %); cancel it instead',
      OLD.id, OLD.status USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER bouquets_delete_only_draft
BEFORE DELETE ON "bouquets"
FOR EACH ROW EXECUTE FUNCTION enforce_bouquet_delete_only_draft();