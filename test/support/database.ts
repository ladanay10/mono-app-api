import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as bcrypt from 'bcryptjs';

// Dedicated, disposable test database. Override with TEST_DATABASE_URL if needed.
export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://admin@localhost:5432/mono_reports_test';

export const OWNER = {
  email: 'owner@test.local',
  password: 'test-pass-123',
  name: 'Test Owner',
};

// Set env before AppConfig is constructed (during Nest compile) so the config
// validates against the test env, not a developer's local `.env`.
export function setTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = TEST_DB_URL;
  process.env.JWT_SECRET = 'test_secret_key_at_least_16_chars_long';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.OWNER_EMAIL = OWNER.email;
  process.env.OWNER_PASSWORD = OWNER.password;
  process.env.OWNER_NAME = OWNER.name;
  process.env.CORS_ORIGIN = '*';
}

// Create the test database if it doesn't exist yet (connect via the maintenance
// DB), so `npm run test:e2e` works out of the box against a running Postgres.
async function ensureDatabase(): Promise<void> {
  const dbName = new URL(TEST_DB_URL).pathname.slice(1);
  const adminUrl = new URL(TEST_DB_URL);
  adminUrl.pathname = '/postgres';
  const admin = new Pool({ connectionString: adminUrl.toString() });
  try {
    await admin.query(`CREATE DATABASE "${dbName}"`);
  } catch (e) {
    if ((e as { code?: string }).code !== '42P04') throw e; // 42P04 = already exists
  } finally {
    await admin.end();
  }
}

// Apply all migrations, wipe every table, seed a single OWNER. Deterministic start.
export async function resetDatabase(): Promise<void> {
  await ensureDatabase();
  const pool = new Pool({ connectionString: TEST_DB_URL });
  try {
    await migrate(drizzle(pool), { migrationsFolder: 'drizzle' });
    // TRUNCATE bypasses the per-row immutability triggers (they fire on DML only).
    await pool.query(
      'TRUNCATE TABLE expenses, bouquet_lines, bouquets, catalog_items, users RESTART IDENTITY CASCADE',
    );
    const hash = await bcrypt.hash(OWNER.password, 10);
    await pool.query(
      `INSERT INTO users (email, display_name, password_hash, role) VALUES ($1, $2, $3, 'OWNER')`,
      [OWNER.email, OWNER.name, hash],
    );
  } finally {
    await pool.end();
  }
}
