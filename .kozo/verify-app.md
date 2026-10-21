# Verify the app

How to run kozo-sample-shop to check a change by hand or with an agent: start
it, confirm it is ready, operate it, keep evidence and clean up. Run every
command from the repository root.

A run uses fixed ports (3000 and 4010) and reseeds the `shop` database, so run
one verification at a time per machine. The tests use the separate
`shop_test` database and other ports, so they can run alongside.

## Start

Serve the production build, as the e2e gate does, so the result matches what
the gates checked.

```sh
mkdir -p .output/verify
test -f .env || cp .env.example .env
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm build > .output/verify/build.log 2>&1
node_modules/.bin/tsx --env-file-if-exists=.env services/fake-payments/server.ts \
  > .output/verify/payments.log 2>&1 &
echo $! > .output/verify/payments.pid
node_modules/.bin/next start --port 3000 > .output/verify/app.log 2>&1 &
echo $! > .output/verify/app.pid
```

To leave an order in `pending_payment`, start the provider with a delay longer
than the shop's 10-second charge timeout: prefix the provider command with
`FAKE_PAYMENTS_DELAY_MS=15000` and pay with the delay card.

## Check that it is ready

Both servers answer within a minute. If not, read the logs in
`.output/verify/` and stop.

```sh
for url in http://127.0.0.1:4010/health http://localhost:3000/; do
  tries=0
  until curl -fs -o /dev/null "$url"; do
    tries=$((tries + 1))
    if [ "$tries" -ge 60 ]; then echo "not ready: $url"; exit 1; fi
    sleep 1
  done
done
```

Open the shop at `http://localhost:3000`, the origin in `BETTER_AUTH_URL`.
better-auth checks the origin of sign-in requests against it, so use
`localhost`, not `127.0.0.1`.

## Operate

Seeded test-only accounts:

| Role | Email | Password |
| --- | --- | --- |
| Buyer | `buyer@example.com` | `buyer-password-123` |
| Admin | `admin@example.com` | `admin-password-123` |

Test cards (any name and address; the country defaults to United States):

| Card number | Outcome |
| --- | --- |
| 4242 4242 4242 4242 | Paid |
| 4000 0000 0000 0002 | Declined; the cart stays |
| 4000 0000 0000 0077 | Paid after a 3-second delay, or pending with the longer delay above |

A pending order blocks its cart until an admin cancels it, so place further
orders from another browser context.

Pages:

| Path | What it shows |
| --- | --- |
| `/`, `/categories/<slug>`, `/search?q=` | The catalog |
| `/products/<slug>` | A product and the add-to-cart form |
| `/cart`, `/checkout` | The cart and the checkout form |
| `/orders/<id>` | An order, to its buyer only |
| `/sign-in`, `/sign-up`, `/account/orders` | Accounts and order history |
| `/admin/orders`, `/admin/products` | The admin, to the admin account only; others get 404 |

To read state the pages do not show, query the database:

```sh
docker compose exec -T postgres psql -U shop -d shop \
  -c "select id, status, total_cents from orders order by created_at desc limit 5"
```

## Evidence

Save everything under `.output/verify/`, which git ignores:

- A full-page screenshot after each step that shows a condition being met,
  named `NN-<step>.png` in the order taken.
- The output of any database query used as evidence, as `NN-<step>.txt`.
- `app.log` and `payments.log`, which the start commands already write.

## Clean up

Stop both servers, then reseed so the next run starts from the same data.
Leave PostgreSQL running; `pnpm db:down` stops it when nothing else needs it.

```sh
kill "$(cat .output/verify/app.pid)" "$(cat .output/verify/payments.pid)"
rm .output/verify/app.pid .output/verify/payments.pid
pnpm db:seed
```
