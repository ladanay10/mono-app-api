import { pgEnum } from 'drizzle-orm/pg-core';

// Canonical UPPER_SNAKE enum values — the single source of truth for the app.
export const userRole = pgEnum('user_role', ['OWNER', 'STAFF']);

export const catalogItemKind = pgEnum('catalog_item_kind', [
  'FLOWER',
  'GREENERY',
  'MATERIAL',
  'PACKAGING',
]);

// Single unit of measure for the whole app: PIECE (шт). Collapsed from the
// original STEM/BUNCH/PIECE/GRAM/METER set — see migration 0002.
export const unitOfMeasure = pgEnum('unit_of_measure', ['PIECE']);

export const bouquetStatus = pgEnum('bouquet_status', [
  'DRAFT',
  'CONFIRMED',
  'SOLD',
  'CANCELLED',
]);

export const expenseScope = pgEnum('expense_scope', ['BOUQUET', 'GENERAL']);

export const expenseKind = pgEnum('expense_kind', [
  'PACKAGING',
  'DELIVERY',
  'LABOR',
  'RENT',
  'UTILITIES',
  'MARKETING',
  'TAX',
  'OVERHEAD',
  'OTHER',
]);
