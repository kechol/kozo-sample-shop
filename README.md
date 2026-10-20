# kozo-sample-shop

A fictional online store used as a target repository for
[kozo](https://github.com/kechol/kozo), a personal software factory. Its
requests, defects and evaluation cases are made up so they can be published
and replayed. The store, its products and its customers do not exist.

## Stack

Next.js (App Router), TypeScript, Drizzle ORM, PostgreSQL, Tailwind CSS,
Vitest and Playwright.

## Getting started

Requirements: Node.js 24, pnpm 10 and Docker.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm db:up          # PostgreSQL on 127.0.0.1:5433
pnpm db:migrate
pnpm db:seed
pnpm dev            # http://localhost:3000
```

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:integration   # uses the shop_test database
pnpm build
pnpm test:e2e           # serves the production build against shop_test
```

kozo runs the same commands as gates defined in
[`.kozo/constraints.yml`](.kozo/constraints.yml).

## License

[MIT](LICENSE)
