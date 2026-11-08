import { and, asc, eq, sql } from "drizzle-orm";
import type { Transaction } from "@/db/client";
import { type OrderStatus, orderItems, orders, products } from "@/db/schema";

export type OrderTransitionResult =
  | { ok: true }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "invalid_status"; status: OrderStatus };

// Every order status change goes through here. The update is conditioned on the status it
// leaves, so of concurrent changes to one order only the first applies and the others see
// the status it left. Leaving pending_payment for anything but paid returns the reserved
// stock in the same transaction, so it returns exactly once.
export async function transitionOrder(
  tx: Transaction,
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  fields: { paymentChargeId?: string; paymentFailureCode?: string } = {},
): Promise<OrderTransitionResult> {
  const [updated] = await tx
    .update(orders)
    .set({ ...fields, status: to })
    .where(and(eq(orders.id, orderId), eq(orders.status, from)))
    .returning({ id: orders.id });
  if (updated) {
    if (from === "pending_payment" && to !== "paid") {
      await returnStock(tx, orderId);
    }
    return { ok: true };
  }
  const [current] = await tx
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!current) return { ok: false, reason: "not_found" };
  return { ok: false, reason: "invalid_status", status: current.status };
}

async function returnStock(tx: Transaction, orderId: string) {
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
}
