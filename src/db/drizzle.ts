import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// DI token for the Drizzle handle. Repositories inject this; nothing else should.
export const DRIZZLE = Symbol('DRIZZLE');

// DI token for the raw pg Pool (owned by DbModule, closed on shutdown).
export const PG_POOL = Symbol('PG_POOL');

export type Database = NodePgDatabase<typeof schema>;
