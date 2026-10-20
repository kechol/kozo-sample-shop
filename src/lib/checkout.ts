import { asc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { cartItems, orderItems, orders, products } from "@/db/schema";
import {
  type ChargeResult,
  type PaymentsClient,
  PaymentsError,
} from "@/lib/payments/client";

export type ShippingDetails = {
  email: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: "empty_cart" }
  | { ok: false; reason: "insufficient_stock"; productNames: string[] }
  | { ok: false; reason: "payment_failed"; orderId: string; code: string }
  | { ok: false; reason: "payment_pending"; orderId: string };

export async function placeOrder(
  db: Database,
  payments: PaymentsClient,
  input: { cartId: string; shipping: ShippingDetails; cardNumber: string },
): Promise<PlaceOrderResult> {
  const reserved = await reserveOrder(db, input.cartId, input.shipping);
  if (!reserved.ok) return reserved;
  const { orderId, totalCents } = reserved;

  let charge: ChargeResult;
  try {
    charge = await payments.charge({
      amountCents: totalCents,
      cardNumber: input.cardNumber,
      idempotencyKey: orderId,
    });
  } catch (error) {
    if (!(error instanceof PaymentsError)) throw error;
    // A timeout or an unexpected response does not say whether the card was charged,
    // so the order stays pending with its stock reserved until the outcome is confirmed.
    return { ok: false, reason: "payment_pending", orderId };
  }

  if (charge.status === "declined") {
    await releaseOrder(db, orderId, charge.code);
    return { ok: false, reason: "payment_failed", orderId, code: charge.code };
  }
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ status: "paid", paymentChargeId: charge.chargeId })
      .where(eq(orders.id, orderId));
    await tx.delete(cartItems).where(eq(cartItems.cartId, input.cartId));
  });
  return { ok: true, orderId };
}

async function reserveOrder(
  db: Database,
  cartId: string,
  shipping: ShippingDetails,
) {
  return db.transaction(async (tx) => {
    const lines = await tx
      .select({ productId: cartItems.productId, quantity: cartItems.quantity })
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId));
    if (lines.length === 0)
      return { ok: false as const, reason: "empty_cart" as const };

    // Lock the product rows in id order so concurrent checkouts wait instead of deadlocking.
    const locked = await tx
      .select({
        id: products.id,
        name: products.name,
        priceCents: products.priceCents,
        stock: products.stock,
      })
      .from(products)
      .where(
        inArray(
          products.id,
          lines.map((line) => line.productId),
        ),
      )
      .orderBy(asc(products.id))
      .for("update");
    const productById = new Map(locked.map((product) => [product.id, product]));

    const shortages = lines.filter(
      (line) => (productById.get(line.productId)?.stock ?? 0) < line.quantity,
    );
    if (shortages.length > 0) {
      return {
        ok: false as const,
        reason: "insufficient_stock" as const,
        productNames: shortages.map(
          (line) =>
            productById.get(line.productId)?.name ?? `#${line.productId}`,
        ),
      };
    }

    const items = lines.map((line) => {
      const product = productById.get(line.productId);
      if (!product) throw new Error(`Product ${line.productId} disappeared`);
      return {
        productId: product.id,
        productName: product.name,
        unitPriceCents: product.priceCents,
        quantity: line.quantity,
      };
    });
    const totalCents = items.reduce(
      (total, item) => total + item.unitPriceCents * item.quantity,
      0,
    );

    for (const item of items) {
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${item.quantity}` })
        .where(eq(products.id, item.productId));
    }
    const [order] = await tx
      .insert(orders)
      .values({
        cartId,
        email: shipping.email,
        shippingName: shipping.name,
        shippingAddress: shipping.address,
        shippingCity: shipping.city,
        shippingPostalCode: shipping.postalCode,
        shippingCountry: shipping.country,
        totalCents,
      })
      .returning({ id: orders.id });
    if (!order) throw new Error("Failed to create the order");
    await tx
      .insert(orderItems)
      .values(items.map((item) => ({ ...item, orderId: order.id })));
    return { ok: true as const, orderId: order.id, totalCents };
  });
}

async function releaseOrder(db: Database, orderId: string, code: string) {
  await db.transaction(async (tx) => {
    const items = await tx
      .select({
        productId: orderItems.productId,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.productId));
    for (const item of items) {
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} + ${item.quantity}` })
        .where(eq(products.id, item.productId));
    }
    await tx
      .update(orders)
      .set({ status: "payment_failed", paymentFailureCode: code })
      .where(eq(orders.id, orderId));
  });
}

export async function getOrder(db: Database, orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: { orderBy: asc(orderItems.id) } },
  });
  return order ?? null;
}
