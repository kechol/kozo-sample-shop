import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { products } from "@/db/schema";
import { addToCart, countCartItems, createCart } from "@/lib/cart";
import { getOrder, placeOrder, type ShippingDetails } from "@/lib/checkout";
import { createPaymentsClient } from "@/lib/payments/client";
import { TEST_CARDS } from "../../services/fake-payments/server";
import { createTestDatabase, reseedTestDatabase } from "../support/database";
import { startFakePayments } from "../support/payments";

const db = createTestDatabase();
let payments: Awaited<ReturnType<typeof startFakePayments>>;

const shipping: ShippingDetails = {
  email: "buyer@example.com",
  name: "Alex Example",
  address: "1 Example Street",
  city: "Springfield",
  postalCode: "12345",
  country: "US",
};

async function product(slug: string) {
  const [row] = await db.select().from(products).where(eq(products.slug, slug));
  if (!row) throw new Error(`No product ${slug}`);
  return row;
}

async function cartWith(slug: string, quantity: number) {
  const cartId = await createCart(db);
  await addToCart(db, cartId, (await product(slug)).id, quantity);
  return cartId;
}

beforeAll(async () => {
  payments = await startFakePayments();
});

beforeEach(async () => {
  await reseedTestDatabase(db);
});

afterAll(async () => {
  await payments.close();
  await db.$client.end();
});

describe("placeOrder", () => {
  it("charges the card, marks the order paid, takes the stock and empties the cart", async () => {
    const cartId = await cartWith("hand-grinder", 2);
    const result = await placeOrder(db, payments.client, {
      cartId,
      shipping,
      cardNumber: TEST_CARDS.success,
    });
    if (!result.ok) throw new Error(`Expected success, got ${result.reason}`);

    const order = await getOrder(db, result.orderId);
    expect(order?.status).toBe("paid");
    expect(order?.paymentChargeId).toMatch(/^ch_/);
    expect(order?.totalCents).toBe(8900 * 2);
    expect(order?.items).toMatchObject([
      { productName: "Hand Coffee Grinder", unitPriceCents: 8900, quantity: 2 },
    ]);
    expect((await product("hand-grinder")).stock).toBe(9 - 2);
    expect(await countCartItems(db, cartId)).toBe(0);
  });

  it("keeps the price paid even when the catalog price changes later", async () => {
    const cartId = await cartWith("headlamp", 1);
    const result = await placeOrder(db, payments.client, {
      cartId,
      shipping,
      cardNumber: TEST_CARDS.success,
    });
    if (!result.ok) throw new Error(result.reason);
    await db
      .update(products)
      .set({ priceCents: 9999 })
      .where(eq(products.slug, "headlamp"));
    const order = await getOrder(db, result.orderId);
    expect(order?.items[0]?.unitPriceCents).toBe(3600);
  });

  it("restores the stock and keeps the cart when the card is declined", async () => {
    const cartId = await cartWith("hand-grinder", 2);
    const result = await placeOrder(db, payments.client, {
      cartId,
      shipping,
      cardNumber: TEST_CARDS.decline,
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "payment_failed",
      code: "card_declined",
    });
    if (result.ok || result.reason !== "payment_failed") return;

    expect((await getOrder(db, result.orderId))?.status).toBe("payment_failed");
    expect((await product("hand-grinder")).stock).toBe(9);
    expect(await countCartItems(db, cartId)).toBe(2);
  });

  it("keeps the order pending and the stock reserved when the charge times out", async () => {
    const cartId = await cartWith("hand-grinder", 1);
    // The provider still completes the delayed charge after the client gives up.
    const impatient = createPaymentsClient({
      baseUrl: payments.baseUrl,
      secretKey: payments.secretKey,
      timeoutMs: 10,
    });
    const result = await placeOrder(db, impatient, {
      cartId,
      shipping,
      cardNumber: TEST_CARDS.delay,
    });
    expect(result).toMatchObject({ ok: false, reason: "payment_pending" });
    if (result.ok || result.reason !== "payment_pending") return;

    expect((await getOrder(db, result.orderId))?.status).toBe(
      "pending_payment",
    );
    expect((await product("hand-grinder")).stock).toBe(9 - 1);
    expect(await countCartItems(db, cartId)).toBe(1);
  });

  it("refuses an empty cart", async () => {
    const cartId = await createCart(db);
    expect(
      await placeOrder(db, payments.client, {
        cartId,
        shipping,
        cardNumber: TEST_CARDS.success,
      }),
    ).toEqual({ ok: false, reason: "empty_cart" });
  });

  it("refuses when the stock ran out after the product was added", async () => {
    const cartId = await cartWith("insulated-bottle", 3);
    await db
      .update(products)
      .set({ stock: 1 })
      .where(eq(products.slug, "insulated-bottle"));
    expect(
      await placeOrder(db, payments.client, {
        cartId,
        shipping,
        cardNumber: TEST_CARDS.success,
      }),
    ).toEqual({
      ok: false,
      reason: "insufficient_stock",
      productNames: ["Insulated Bottle 750ml"],
    });
    expect((await product("insulated-bottle")).stock).toBe(1);
  });

  it("never oversells when checkouts race for the last units", async () => {
    await db
      .update(products)
      .set({ stock: 2 })
      .where(eq(products.slug, "wall-clock"));
    const carts = await Promise.all(
      Array.from({ length: 5 }, () => cartWith("wall-clock", 1)),
    );

    const results = await Promise.all(
      carts.map((cartId) =>
        placeOrder(db, payments.client, {
          cartId,
          shipping,
          cardNumber: TEST_CARDS.delay,
        }),
      ),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(2);
    expect(results.filter((result) => !result.ok)).toEqual(
      Array.from({ length: 3 }, () => ({
        ok: false,
        reason: "insufficient_stock",
        productNames: ["Minimal Wall Clock"],
      })),
    );
    expect((await product("wall-clock")).stock).toBe(0);
  });
});
