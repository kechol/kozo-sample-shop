import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { users } from "@/db/schema";
import { addToCart, createCart } from "@/lib/cart";
import { listOrdersForUser, placeOrder } from "@/lib/checkout";
import { TEST_CARDS } from "../../services/fake-payments/server";
import { createTestDatabase, reseedTestDatabase } from "../support/database";
import { startFakePayments } from "../support/payments";

const db = createTestDatabase();
let payments: Awaited<ReturnType<typeof startFakePayments>>;

const shipping = {
  email: "buyer@example.com",
  name: "Sample Buyer",
  address: "1 Example Street",
  city: "Springfield",
  postalCode: "12345",
  country: "US",
};

async function userIdByEmail(email: string) {
  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(users);
  const row = rows.find((user) => user.email === email);
  if (!row) throw new Error(`No user ${email}`);
  return row.id;
}

async function buy(userId: string | null, productId: number) {
  const cartId = await createCart(db);
  await addToCart(db, cartId, productId, 1);
  const result = await placeOrder(db, payments.client, {
    cartId,
    userId,
    shipping,
    cardNumber: TEST_CARDS.success,
  });
  if (!result.ok) throw new Error(result.reason);
  return result.orderId;
}

beforeEach(async () => {
  payments ??= await startFakePayments();
  await reseedTestDatabase(db);
});

afterAll(async () => {
  await payments.close();
  await db.$client.end();
});

describe("listOrdersForUser", () => {
  it("returns only the buyer's own orders, newest first", async () => {
    const buyer = await userIdByEmail("buyer@example.com");
    const other = await userIdByEmail("admin@example.com");
    const first = await buy(buyer, 1);
    const second = await buy(buyer, 2);
    await buy(other, 3);
    await buy(null, 4);

    const orders = await listOrdersForUser(db, buyer);
    expect(orders.map((order) => order.id)).toEqual([second, first]);
    expect(orders.every((order) => order.userId === buyer)).toBe(true);
  });

  it("returns nothing for a buyer without orders", async () => {
    expect(
      await listOrdersForUser(db, await userIdByEmail("admin@example.com")),
    ).toEqual([]);
  });
});
