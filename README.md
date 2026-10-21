# kozo-sample-shop

A fictional online store used as a target repository for
[kozo](https://github.com/kechol/kozo), a personal software factory. Its
requests, defects and evaluation cases are made up so they can be published
and replayed. The store, its products and its customers do not exist.

## Stack

Next.js (App Router), TypeScript, Drizzle ORM, PostgreSQL, better-auth,
Tailwind CSS, Vitest and Playwright.

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

## Accounts

Buyers can check out as guests or create an account with an email and password
(better-auth). Orders placed while signed in appear under **Your orders**. An
order page is shown only to its buyer: the signed-in account for an account's
order, or the browser whose cart placed it for a guest order. Signing out
clears the cart, so the next person on a shared browser starts empty.

The admin account manages the shop under `/admin`: it creates and edits
products, lists every order, marks paid orders shipped and cancels pending
orders, which returns their stock. Other visitors get a 404 there.

`pnpm db:seed` creates two test-only accounts:

| Account | Email | Password |
| --- | --- | --- |
| Buyer | `buyer@example.com` | `buyer-password-123` |
| Admin | `admin@example.com` | `admin-password-123` |

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
until an admin cancels that order. A cancelled order stays cancelled even if
its charge completes later; the admin order list then shows the charge to
refund with the provider, since refunds are not part of the shop.

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
[`.kozo/constraints.yml`](.kozo/constraints.yml), and
[`.kozo/charter.yml`](.kozo/charter.yml) sets what kozo may change here
unattended.

## Eval cases

[`evals/`](evals) holds kozo's eval cases: requests with the outcome kozo should
reach, from completing the change to stopping with a question. Cases for this
shop start from a tag `eval/<case>` on a parentless commit that holds the shop
without `evals/`, and check the result with a hidden test. Cases replayed from
honojs/hono and preactjs/preact run on local clones and reference the upstream
issue and fix instead of copying them.

## License

[MIT](LICENSE)
