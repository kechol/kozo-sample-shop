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
pnpm payments:dev   # fake payment provider on 127.0.0.1:4010
pnpm dev            # http://localhost:3000, in another terminal
```

## Payments

Checkout charges cards through a fake payment provider in
[`services/fake-payments`](services/fake-payments). It accepts only the
test-only key in `.env.example` and decides the outcome by card number:

| Card number | Outcome |
| --- | --- |
| 4242 4242 4242 4242 | Succeeds |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 0077 | Succeeds after a delay (3 seconds by default) |

Checkout reserves stock and creates the order in one transaction, then
charges the card with the order id as the idempotency key. When the provider
refuses the request (any 4xx, such as a declined card), the order becomes
`payment_failed`, the stock returns and the cart stays. When it times out or
answers with anything else, the outcome is unknown, so the order stays
`pending_payment` with its stock reserved, and the cart cannot check out again
until that order is settled.

An order page is shown only to the browser whose cart placed the order.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:integration   # uses the shop_test database
pnpm build
pnpm test:e2e           # serves the production build and the fake provider against shop_test
```

kozo runs the same commands as gates defined in
[`.kozo/constraints.yml`](.kozo/constraints.yml).

## License

[MIT](LICENSE)
