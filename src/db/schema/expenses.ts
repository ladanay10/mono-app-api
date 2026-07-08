import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { expenseKind, expenseScope } from './enums';
import { money, timestamps } from './columns';
import { bouquets } from './bouquets';
import { users } from './users';

// "Other expenses" in income = revenue − (flower cost + other expenses).
// One table for both bouquet-attributed and general overhead, disambiguated by
// scope + a CHECK (not a bare nullable-FK flag).
export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: expenseScope('scope').notNull(),
    // Set IFF scope = BOUQUET. RESTRICT so a sold bouquet's expense is never
    // orphaned or silently re-labelled as overhead.
    bouquetId: uuid('bouquet_id').references(() => bouquets.id, { onDelete: 'restrict' }),
    kind: expenseKind('kind').notNull(),
    description: text('description'),
    amountKopiyky: money('amount_kopiyky').notNull(),
    incurredOn: date('incurred_on').notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    ...timestamps,
  },
  (t) => [
    check(
      'expense_scope_consistency',
      sql`(${t.scope} = 'BOUQUET' AND ${t.bouquetId} IS NOT NULL) OR (${t.scope} = 'GENERAL' AND ${t.bouquetId} IS NULL)`,
    ),
    check('expense_amount_nonneg', sql`${t.amountKopiyky} >= 0`),
    index('expenses_bouquet_idx').on(t.bouquetId),
    index('expenses_incurred_on_idx').on(t.incurredOn),
  ],
);

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
