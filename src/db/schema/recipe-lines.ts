import { sql } from 'drizzle-orm';
import {
  check,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { unitOfMeasure } from './enums';
import { money } from './columns';
import { recipes } from './recipes';
import { catalogItems } from './catalog-items';

// Template line. Self-describing (name/unit/prices) so it survives a catalog
// change and supports ad-hoc lines. On instantiation, a catalog line re-pulls
// the current price; a stored price is the fallback for ad-hoc / gone items.
export const recipeLines = pgTable(
  'recipe_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipeId: uuid('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    catalogItemId: uuid('catalog_item_id').references(() => catalogItems.id, {
      onDelete: 'set null',
    }),
    itemNameSnapshot: text('item_name_snapshot').notNull(),
    unitSnapshot: unitOfMeasure('unit_snapshot').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
    unitPurchasePriceKopiyky: money('unit_purchase_price_kopiyky').notNull(),
    unitSalePriceKopiyky: money('unit_sale_price_kopiyky').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('recipe_line_quantity_positive', sql`${t.quantity} > 0`),
    check(
      'recipe_line_prices_nonneg',
      sql`${t.unitPurchasePriceKopiyky} >= 0 AND ${t.unitSalePriceKopiyky} >= 0`,
    ),
    index('recipe_lines_recipe_idx').on(t.recipeId),
  ],
);

export type RecipeLine = typeof recipeLines.$inferSelect;
export type NewRecipeLine = typeof recipeLines.$inferInsert;
