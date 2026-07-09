import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './columns';
import { users } from './users';

// A reusable bouquet template — the flower composition a florist repeats.
// Instantiating a recipe creates a fresh DRAFT bouquet, re-pulling current
// catalog prices, so a template is structure, not frozen money.
export const recipes = pgTable('recipes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  notes: text('notes'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, {
    onDelete: 'restrict',
  }),
  ...timestamps,
});

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
