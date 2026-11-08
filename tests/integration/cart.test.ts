import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { products } from "@/db/schema";
import {
  addToCart,
  countCartItems,
  createCart,
  getCart,
  removeFromCart,
  setCartQuantity,
} from "@/lib/cart";
import { createTestDatabase, reseedTestDatabase } from "../support/database";

const db = createTestDatabase();

async function productId(slug: string) {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug));
  if (!row) throw new Error(`No product ${slug}`);
  return row.id;
}

beforeEach(async () => {
  await reseedTestDatabase(db);
});

afterAll(async () => {
  await db.$client.end();
});

describe("cart", () => {
  it("adds products and merges repeated additions", async () => {
    const cartId = await createCart(db);
    const kettle = await productId("gooseneck-kettle");
    await addToCart(db, cartId, kettle, 1);
    await addToCart(db, cartId, kettle, 2);
    await addToCart(db, cartId, await productId("paper-filters-100"), 1);

    const cart = await getCart(db, cartId);
    expect(cart.lines.map((line) => [line.slug, line.quantity])).toEqual([
      ["gooseneck-kettle", 3],
      ["paper-filters-100", 1],
    ]);
    expect(cart.subtotalCents).toBe(5400 * 3 + 700);
    expect(await countCartItems(db, cartId)).toBe(4);
  });

  it("caps the quantity at the stock", async () => {
    const cartId = await createCart(db);
    const result = await addToCart(
      db,
      cartId,
      await productId("insulated-bottle"),
      10,
    );
    expect(result).toEqual({ ok: true, quantity: 3 });
  });

  it("refuses sold-out and unknown products", async () => {
    const cartId = await createCart(db);
    expect(
      await addToCart(db, cartId, await productId("travel-tumbler"), 1),
    ).toEqual({
      ok: false,
      reason: "out_of_stock",
    });
    expect(await addToCart(db, cartId, 99_999, 1)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("updates and removes lines", async () => {
    const cartId = await createCart(db);
    const knife = await productId("chef-knife-8");
    await addToCart(db, cartId, knife, 1);

    expect(await setCartQuantity(db, cartId, knife, 5)).toEqual({
      ok: true,
      quantity: 5,
    });
    expect(await setCartQuantity(db, cartId, knife, 0)).toEqual({
      ok: true,
      quantity: 0,
    });
    expect((await getCart(db, cartId)).lines).toEqual([]);

    await addToCart(db, cartId, knife, 1);
    await removeFromCart(db, cartId, knife);
    expect(await countCartItems(db, cartId)).toBe(0);
  });

  it("keeps carts separate", async () => {
    const first = await createCart(db);
    const second = await createCart(db);
    await addToCart(db, first, await productId("headlamp"), 1);
    expect(await countCartItems(db, second)).toBe(0);
  });
});
