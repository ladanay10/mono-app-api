import { sql } from 'drizzle-orm';
import { check, index, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { unitOfMeasure } from './enums';
import { money } from './columns';
import { bouquets } from './bouquets';
import { catalogItems } from './catalog-items';

// Per-flower SNAPSHOT line items — the provenance core. Fully self-describing so
// a line survives catalog rename/delete and supports ad-hoc (non-catalog) flowers.
// Immutability once the parent bouquet leaves DRAFT is enforced by a DB trigger
// (see migration 0001), not by service discipline.
export const bouquetLines = pgTable(
  'bouquet_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bouquetId: uuid('bouquet_id')
      .notNull()
      .references(() => bouquets.id, { onDelete: 'cascade' }),
    // Reference ONLY, never a price source. NULL = ad-hoc market flower.
    catalogItemId: uuid('catalog_item_id').references(() => catalogItems.id, {
      onDelete: 'set null',
    }),
    itemNameSnapshot: text('item_name_snapshot').notNull(),
    unitSnapshot: unitOfMeasure('unit_snapshot').notNull(),
    // A count (allows 0.5 bunch); NOT money.
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
    unitPurchasePriceKopiyky: money('unit_purchase_price_kopiyky').notNull(),
    unitSalePriceKopiyky: money('unit_sale_price_kopiyky').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('line_quantity_positive', sql`${t.quantity} > 0`),
    check(
      'line_prices_nonneg',
      sql`${t.unitPurchasePriceKopiyky} >= 0 AND ${t.unitSalePriceKopiyky} >= 0`,
    ),
    index('bouquet_lines_bouquet_idx').on(t.bouquetId),
    index('bouquet_lines_catalog_idx').on(t.catalogItemId),
  ],
);

export type BouquetLine = typeof bouquetLines.$inferSelect;
export type NewBouquetLine = typeof bouquetLines.$inferInsert;
