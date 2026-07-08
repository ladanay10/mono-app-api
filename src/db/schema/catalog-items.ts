import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { catalogItemKind, unitOfMeasure } from './enums';
import { money, timestamps } from './columns';
import { users } from './users';

// The catalog / price book — the ONLY home of live prices. Each flower/material
// carries two manually-set prices per unit; markup ("навар") is derived.
export const catalogItems = pgTable(
  'catalog_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    kind: catalogItemKind('kind').notNull(),
    category: text('category'),
    unit: unitOfMeasure('unit').notNull(),
    purchasePriceKopiyky: money('purchase_price_kopiyky').notNull(),
    salePriceKopiyky: money('sale_price_kopiyky').notNull(),
    supplierName: text('supplier_name'),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    ...timestamps,
  },
  (t) => [
    check(
      'catalog_prices_nonneg',
      sql`${t.purchasePriceKopiyky} >= 0 AND ${t.salePriceKopiyky} >= 0`,
    ),
    index('catalog_items_active_idx').on(t.isActive),
  ],
);

export type CatalogItem = typeof catalogItems.$inferSelect;
export type NewCatalogItem = typeof catalogItems.$inferInsert;
