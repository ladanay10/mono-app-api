import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ProxyThrottlerGuard } from './common/guards/proxy-throttler.guard';
import { AppController } from './app.controller';
import { ConfigModule } from './config/config.module';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CatalogModule } from './catalog/catalog.module';
import { BouquetsModule } from './bouquets/bouquets.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReportsModule } from './reports/reports.module';
import { RecipesModule } from './recipes/recipes.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Per-client-IP rate limits (two windows). A burst window catches rapid
    // floods; the minute window caps sustained abuse. Login tightens 'default'
    // further. Real client IP is resolved by ProxyThrottlerGuard behind the CDN.
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'burst', ttl: 10_000, limit: 40 },
        { name: 'default', ttl: 60_000, limit: 120 },
      ],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    ConfigModule,
    DbModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    BouquetsModule,
    ExpensesModule,
    ReportsModule,
    RecipesModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ProxyThrottlerGuard },
  ],
})
export class AppModule {}
