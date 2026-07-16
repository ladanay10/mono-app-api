import 'dotenv/config';
import { Pool } from 'pg';
import { loadEnv } from '../src/config/env';

/**
 * Wipes all data from the database (keeps the schema/tables intact).
 *
 *   npm run db:reset          → clears business data, KEEPS the owner user
 *                               (you can still log in right after)
 *   npm run db:reset -- --all → also wipes the users table
 *                               (then run `npm run seed` to recreate the owner)
 *
 * Uses DATABASE_URL from the environment — point it at whichever DB you mean
 * to clear (local vs. Neon/production).
 */
const WIPE_USERS = process.argv.includes('--all');

// bouquet_lines / recipe_lines first is not required (CASCADE handles FKs),
// but listing every data table keeps the intent explicit.
const DATA_TABLES = [
  'bouquet_lines',
  'bouquets',
  'expenses',
  'catalog_items',
  'recipe_lines',
  'recipes',
];

async function main() {
  const env = loadEnv();
  const pool = new Pool({ connectionString: env.DATABASE_URL });

  const tables = WIPE_USERS ? [...DATA_TABLES, 'users'] : DATA_TABLES;
  const list = tables.map((t) => `"${t}"`).join(', ');

  await pool.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);

  // eslint-disable-next-line no-console
  console.log(`✔ Cleared: ${tables.join(', ')}`);
  if (!WIPE_USERS) {
    // eslint-disable-next-line no-console
    console.log(
      '  Owner user kept — login still works. Use `-- --all` to wipe users too.',
    );
  } else {
    // eslint-disable-next-line no-console
    console.log('  Users wiped — run `npm run seed` to recreate the owner.');
  }

  await pool.end();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
