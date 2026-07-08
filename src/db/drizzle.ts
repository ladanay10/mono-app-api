import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// DI token for the Drizzle handle. Repositories inject this; nothing else should.
export const DRIZZLE = Symbol('DRIZZLE');

export type Database = NodePgDatabase<typeof schema>;
