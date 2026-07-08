import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import * as schema from '../src/db/schema';
import { loadEnv } from '../src/config/env';

async function main() {
  const env = loadEnv();
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, env.OWNER_EMAIL),
  });

  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`Owner already exists: ${env.OWNER_EMAIL}`);
  } else {
    const passwordHash = await bcrypt.hash(env.OWNER_PASSWORD, 10);
    await db.insert(schema.users).values({
      email: env.OWNER_EMAIL,
      displayName: env.OWNER_NAME,
      passwordHash,
      role: 'OWNER',
    });
    // eslint-disable-next-line no-console
    console.log(`Seeded owner: ${env.OWNER_EMAIL} (password from OWNER_PASSWORD)`);
  }

  await pool.end();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
