import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { DRIZZLE } from './drizzle';
import { AppConfig } from '../config/config.service';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => {
        const pool = new Pool({ connectionString: config.env.DATABASE_URL });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DbModule {}
