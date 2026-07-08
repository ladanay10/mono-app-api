# mono-reports-api

Backend for MONO's income/profit tracker — **NestJS + Drizzle + PostgreSQL**.
Money is stored as integer **kopiyky** (`bigint`). Every flower carries a purchase and a
sale price; a bouquet snapshots both at compose time so past bouquets never change when
catalog prices move (enforced by a DB trigger). `revenue` = **брудний дохід**,
`net_profit` = **чистий дохід**.

## Setup (local dev)

```bash
npm install
# local Postgres 17 (Homebrew): brew services start postgresql@17
createdb mono_reports
cp .env.example .env          # already present for local dev
npm run db:migrate            # applies tables + bouquet_profit view + immutability trigger
npm run seed                  # creates the OWNER user from OWNER_EMAIL/OWNER_PASSWORD
npm run start:dev             # http://localhost:3000/api
```

Owner login (default): `owner@mono.local` / `changeme123` (change in `.env`).

## Production (Neon)

Set `DATABASE_URL` to your Neon connection string (`...sslmode=require`), a strong
`JWT_SECRET`, and `CORS_ORIGIN` to the deployed frontend URL. Then `npm run db:migrate`
against Neon, `npm run seed`, `npm run build`, `npm run start:prod`. Deploy on any Node
host (Railway / Render / Fly) — this is a standard Node server, not a Cloudflare Worker.

## Data model

`users` · `catalog_items` (two prices/unit) · `bouquets` · `bouquet_lines` (frozen
snapshots) · `expenses` (BOUQUET or GENERAL) · `bouquet_profit` (VIEW). See
`src/db/schema/` and `drizzle/0001_*.sql` (view + triggers).

## API (all under `/api`, JWT required except login/health)

- `POST /auth/login`, `GET /auth/me`
- `GET/POST /catalog`, `GET/PATCH/DELETE /catalog/:id`
- `GET/POST /bouquets`, `GET/PATCH/DELETE /bouquets/:id`
- `POST /bouquets/:id/lines`, `PATCH|DELETE /bouquets/:id/lines/:lineId`
- `POST /bouquets/:id/{confirm,sell,cancel,clone}`
- `GET/POST /expenses`, `DELETE /expenses/:id`
- `GET /reports/{summary,monthly,top-flowers,outstanding}`

## Tests

```bash
npm test            # money math + profit mapping unit tests
```
