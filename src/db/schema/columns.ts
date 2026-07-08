import { bigint, timestamp } from 'drizzle-orm/pg-core';

// Money is stored as integer minor units (kopiyky). 1 UAH = 100 kopiyky.
// bigint avoids int4 overflow on stored/summed totals; mode 'number' is exact
// far beyond any realistic shop total (JS safe integer ≈ 9e15 kopiyky).
export const money = (name: string) => bigint(name, { mode: 'number' });

// Persist UTC; render in the viewer's timezone (Europe/Kyiv) in the client.
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
};
