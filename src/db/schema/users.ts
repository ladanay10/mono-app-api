import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { userRole } from './enums';
import { timestamps } from './columns';

// Single owner now; multi-user is purely additive via `role` + FK later.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  passwordHash: text('password_hash'),
  role: userRole('role').notNull().default('OWNER'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
