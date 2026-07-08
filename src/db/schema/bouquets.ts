import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { bouquetStatus } from './enums';
import { money, timestamps } from './columns';
import { users } from './users';

// The revenue + costing unit (header). Charged price, discount and the business
// sale date live here — no separate sales table in the MVP.
export const bouquets = pgTable(
  'bouquets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title'),
    status: bouquetStatus('status').notNull().default('DRAFT'),
    // Final charged price; defaults to Σ line sale prices, owner may override.
    salePriceKopiyky: money('sale_price_kopiyky'),
    discountKopiyky: money('discount_kopiyky').notNull().default(0),
    amountReceivedKopiyky: money('amount_received_kopiyky').notNull().default(0),
    // Business date (plain date) → month buckets are timezone-proof.
    soldOn: date('sold_on'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    ...timestamps,
  },
  (t) => [
    check('bouquet_sold_has_date', sql`(${t.status} = 'SOLD') = (${t.soldOn} IS NOT NULL)`),
    check(
      'bouquet_amounts_nonneg',
      sql`${t.discountKopiyky} >= 0 AND ${t.amountReceivedKopiyky} >= 0`,
    ),
    index('bouquets_status_idx').on(t.status),
    index('bouquets_sold_on_idx').on(t.soldOn),
  ],
);

export type Bouquet = typeof bouquets.$inferSelect;
export type NewBouquet = typeof bouquets.$inferInsert;
