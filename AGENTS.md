# Agent instructions for kozo-sample-shop

kozo-sample-shop is a fictional online store and a target repository for the
kozo software factory. Everything in it, including people, addresses and
credentials, is made up. Treat the repository as public.

## Layout

| Path | Contents |
| --- | --- |
| `src/app/` | Next.js App Router pages, Server Actions and the better-auth route; the admin under `admin/` |
| `src/lib/` | Domain logic: catalog, cart, checkout, payments client, auth; admin products and orders under `admin/` |
| `src/db/` | Drizzle schema, client, migrator and seed data |
| `drizzle/` | Generated SQL migrations and their metadata |
| `services/fake-payments/` | The local fake payment provider |
| `tests/integration/` | Vitest tests against the `shop_test` database |
| `e2e/` | Playwright tests against the production build |
| `.kozo/` | kozo's gate definitions and app verification steps |

## Commands

```sh
pnpm install --frozen-lockfile
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm payments:dev       # fake payment provider on 127.0.0.1:4010
pnpm dev                # http://localhost:3000
pnpm typecheck
pnpm lint               # `pnpm format` fixes formatting
pnpm test:unit
pnpm test:integration
pnpm build
pnpm test:e2e           # needs `pnpm build` first
```

## Conventions

- Store money as integer cents and format it only with `formatPrice`.
- Change the schema in `src/db/schema.ts`, then run `pnpm db:generate --name <change>`;
  commit the generated files without editing them.
- Keep domain logic in `src/lib/` as functions that take the database as an argument,
  so integration tests can pass the test database. Pages and Server Actions only parse
  input, call those functions and render.
- Validate every Server Action input with zod before using it.
- Check authorization on the server in the page or action that reads the data, never
  only by hiding links. Every admin page and admin Server Action calls `requireAdmin()`.
- Send every charge with the order id as the idempotency key. Release an order only on
  a definite refusal (4xx); any other failure leaves it `pending_payment`.
- Lock rows that a decision depends on (`SELECT … FOR UPDATE`), in id order.
- Change an order's status with an update conditioned on the status it leaves
  (`WHERE status = …`), and return stock only in the transaction that moved the order
  out of `pending_payment`, so concurrent changes never apply twice.
- Use fictional data and reserved domains such as `example.com` in seeds and tests.
- Write tests at the lowest level that can prove the behaviour: unit for pure
  functions, integration for database rules, e2e for what a buyer sees.

## Rules and how they are enforced

| Rule | Enforced by |
| --- | --- |
| Code type-checks, including route types | `typecheck` gate |
| Formatting, import order and lint rules | `lint` gate (Biome) |
| Pure logic behaves as specified | `unit` gate |
| Stock, orders and access rules hold in the database | `integration` gate |
| The app builds without a database | `build` gate |
| Buyers can browse, buy and see only their own orders | `e2e` gate |
| Only the admin account reaches admin pages and actions | `e2e` gate |
| No secrets in the repository | gitleaks before each commit |
| Generated migrations stay unedited | Review; `drizzle/` is a protected path |
| Payment and auth rules stay intact | Review; `src/lib/payments/` and `src/lib/auth.ts` are protected paths |

The gates are defined once in [`.kozo/constraints.yml`](.kozo/constraints.yml), and CI
runs the deep level.

## Protected paths

Do not change these without a human's explicit approval:

- `.kozo/`, `AGENTS.md`, `CLAUDE.md`
- `drizzle/`
- `src/lib/payments/`, `src/lib/auth.ts`
- `.github/workflows/`

## Test-only credentials

The values in `.env.example` and the seeded accounts exist only for local use and tests.

| Account | Email | Password |
| --- | --- | --- |
| Buyer | `buyer@example.com` | `buyer-password-123` |
| Admin | `admin@example.com` | `admin-password-123` |

Test cards are listed in the [README](README.md#payments).
