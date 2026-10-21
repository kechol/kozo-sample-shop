import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { categories, products } from "@/db/schema";
import {
  cancelOrder,
  listOrdersForAdmin,
  markOrderShipped,
} from "@/lib/admin/orders";
import {
  createProduct,
  type ProductInput,
  updateProduct,
} from "@/lib/admin/products";
import { addToCart, countCartItems, createCart } from "@/lib/cart";
import { getOrder, placeOrder } from "@/lib/checkout";
import {
  type ChargeResult,
  type PaymentsClient,
  PaymentsError,
} from "@/lib/payments/client";
import { createTestDatabase, reseedTestDatabase } from "../support/database";

const db = createTestDatabase();

const shipping = {
  email: "buyer@example.com",
  name: "Alex Example",
  address: "1 Example Street",
  city: "Springfield",
  postalCode: "12345",
  country: "US",
};

const succeeds: PaymentsClient = {
  charge: async () => ({ status: "succeeded", chargeId: "ch_test" }),
};

// The outcome of a timed-out charge is unknown, so the order stays pending.
const timesOut: PaymentsClient = {
  charge: async () => {
    throw new PaymentsError("timed out");
  },
};

// Places an order whose charge stays open until the test releases it, to interleave an
// admin action with the charge.
async function placeHeldOrder(outcome: ChargeResult) {
  let release = () => {};
  let markStarted = () => {};
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const client: PaymentsClient = {
    charge: async () => {
      markStarted();
      await released;
      return outcome;
    },
  };
  const cartId = await cartWith("hand-grinder", 2);
  const placing = placeOrder(db, client, {
    cartId,
    shipping,
    cardNumber: "4242424242424242",
  });
  await started;
  const { items } = await listOrdersForAdmin(db, { status: "pending_payment" });
  const orderId = items[0]?.id;
  if (!orderId) throw new Error("No pending order");
  return { cartId, orderId, placing, release };
}

async function product(slug: string) {
  const [row] = await db
    .select({ id: products.id, stock: products.stock })
    .from(products)
    .where(eq(products.slug, slug));
  if (!row) throw new Error(`No product ${slug}`);
  return row;
}

const productId = async (slug: string) => (await product(slug)).id;
const stockOf = async (slug: string) => (await product(slug)).stock;

async function cartWith(slug: string, quantity: number) {
  const cartId = await createCart(db);
  await addToCart(db, cartId, await productId(slug), quantity);
  return cartId;
}

async function order(client: PaymentsClient, slug = "hand-grinder") {
  const cartId = await cartWith(slug, 2);
  const result = await placeOrder(db, client, {
    cartId,
    shipping,
    cardNumber: "4242424242424242",
  });
  if (result.ok) return { cartId, orderId: result.orderId };
  if (result.reason === "payment_pending") {
    return { cartId, orderId: result.orderId };
  }
  throw new Error(`Unexpected ${result.reason}`);
}

beforeEach(async () => {
  await reseedTestDatabase(db);
});

afterAll(async () => {
  await db.$client.end();
});

describe("markOrderShipped", () => {
  it("ships a paid order once", async () => {
    const { orderId } = await order(succeeds);
    expect(await markOrderShipped(db, orderId)).toEqual({ ok: true });
    expect((await getOrder(db, orderId))?.status).toBe("shipped");
    expect(await markOrderShipped(db, orderId)).toEqual({
      ok: false,
      reason: "invalid_status",
      status: "shipped",
    });
  });

  it("refuses an order that is not paid", async () => {
    const { orderId } = await order(timesOut);
    expect(await markOrderShipped(db, orderId)).toEqual({
      ok: false,
      reason: "invalid_status",
      status: "pending_payment",
    });
    expect(
      await markOrderShipped(db, "00000000-0000-4000-8000-000000000000"),
    ).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("cancelOrder", () => {
  it("cancels a pending order and returns its stock", async () => {
    const { cartId, orderId } = await order(timesOut);
    expect(await stockOf("hand-grinder")).toBe(9 - 2);

    expect(await cancelOrder(db, orderId)).toEqual({ ok: true });
    expect((await getOrder(db, orderId))?.status).toBe("cancelled");
    expect(await stockOf("hand-grinder")).toBe(9);

    // The cart is no longer blocked by a pending order.
    const retry = await placeOrder(db, succeeds, {
      cartId,
      shipping,
      cardNumber: "4242424242424242",
    });
    expect(retry.ok).toBe(true);
  });

  it("refuses a paid order and keeps its stock taken", async () => {
    const { orderId } = await order(succeeds);
    expect(await cancelOrder(db, orderId)).toEqual({
      ok: false,
      reason: "invalid_status",
      status: "paid",
    });
    expect(await stockOf("hand-grinder")).toBe(9 - 2);
  });

  it("returns the stock once when two admins cancel at the same time", async () => {
    const { orderId } = await order(timesOut);
    const results = await Promise.all([
      cancelOrder(db, orderId),
      cancelOrder(db, orderId),
    ]);
    expect(results).toContainEqual({ ok: true });
    expect(results).toContainEqual({
      ok: false,
      reason: "invalid_status",
      status: "cancelled",
    });
    expect(await stockOf("hand-grinder")).toBe(9);
  });

  it("keeps the order cancelled when its charge succeeds afterwards", async () => {
    const { cartId, orderId, placing, release } = await placeHeldOrder({
      status: "succeeded",
      chargeId: "ch_late",
    });

    expect(await cancelOrder(db, orderId)).toEqual({ ok: true });
    release();
    expect(await placing).toEqual({
      ok: false,
      reason: "order_cancelled",
      orderId,
    });
    expect((await getOrder(db, orderId))?.status).toBe("cancelled");
    expect(await stockOf("hand-grinder")).toBe(9);
    expect(await countCartItems(db, cartId)).toBe(2);
  });

  it("returns the stock once when the provider refuses the charge afterwards", async () => {
    const { orderId, placing, release } = await placeHeldOrder({
      status: "not_charged",
      code: "card_declined",
    });

    expect(await cancelOrder(db, orderId)).toEqual({ ok: true });
    release();
    await placing;
    expect((await getOrder(db, orderId))?.status).toBe("cancelled");
    expect(await stockOf("hand-grinder")).toBe(9);
  });
});

describe("listOrdersForAdmin", () => {
  it("lists every buyer's orders newest first and filters by status", async () => {
    const first = await order(succeeds, "hand-grinder");
    const second = await order(timesOut, "headlamp");
    const all = await listOrdersForAdmin(db);
    expect(all.items.map((item) => item.id)).toEqual([
      second.orderId,
      first.orderId,
    ]);
    const paid = await listOrdersForAdmin(db, { status: "paid" });
    expect(paid.items.map((item) => item.id)).toEqual([first.orderId]);
  });
});

describe("products", () => {
  async function input(overrides: Partial<ProductInput> = {}) {
    const [category] = await db.select().from(categories).limit(1);
    if (!category) throw new Error("No category");
    return {
      name: "Canvas Tote",
      slug: "canvas-tote",
      description: "A sturdy tote.",
      priceCents: 3200,
      stock: 5,
      categoryId: category.id,
      ...overrides,
    };
  }

  it("creates a product", async () => {
    const result = await createProduct(db, await input());
    expect(result).toEqual({ ok: true, id: expect.any(Number) });
    expect(await stockOf("canvas-tote")).toBe(5);
  });

  it("refuses a slug another product uses", async () => {
    expect(
      await createProduct(db, await input({ slug: "hand-grinder" })),
    ).toEqual({ ok: false, reason: "slug_taken" });
    const id = await productId("headlamp");
    expect(
      await updateProduct(db, id, await input({ slug: "hand-grinder" }), 5),
    ).toEqual({ ok: false, reason: "slug_taken" });
  });

  it("refuses a category that does not exist", async () => {
    expect(await createProduct(db, await input({ categoryId: 999 }))).toEqual({
      ok: false,
      reason: "unknown_category",
    });
  });

  it("keeps sales made while the form was open when the stock was not edited", async () => {
    const id = await productId("hand-grinder");
    const seen = await stockOf("hand-grinder");
    await order(succeeds);
    const result = await updateProduct(
      db,
      id,
      await input({ slug: "hand-grinder", name: "Grinder", stock: seen }),
      seen,
    );
    expect(result).toEqual({ ok: true, id });
    expect(await stockOf("hand-grinder")).toBe(seen - 2);
  });

  it("refuses an edited stock when sales changed it meanwhile", async () => {
    const id = await productId("hand-grinder");
    const seen = await stockOf("hand-grinder");
    await order(succeeds);
    expect(
      await updateProduct(
        db,
        id,
        await input({ slug: "hand-grinder", stock: 50 }),
        seen,
      ),
    ).toEqual({ ok: false, reason: "stock_changed", currentStock: seen - 2 });
    expect(await stockOf("hand-grinder")).toBe(seen - 2);
  });

  it("applies an edited stock when nothing changed it meanwhile", async () => {
    const id = await productId("hand-grinder");
    const seen = await stockOf("hand-grinder");
    expect(
      await updateProduct(
        db,
        id,
        await input({ slug: "hand-grinder", stock: 50 }),
        seen,
      ),
    ).toEqual({ ok: true, id });
    expect(await stockOf("hand-grinder")).toBe(50);
  });

  it("reports a product that does not exist", async () => {
    expect(await updateProduct(db, 999_999, await input(), 0)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });
});
