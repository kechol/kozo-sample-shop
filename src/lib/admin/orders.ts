import { and, asc, count, desc, eq } from "drizzle-orm";
import type { Database, Transaction } from "@/db/client";
import { type OrderStatus, orderItems, orders } from "@/db/schema";
import { returnStock } from "@/lib/checkout";

export const ADMIN_ORDERS_PAGE_SIZE = 20;

export async function listOrdersForAdmin(
  db: Database,
  query: { status?: OrderStatus; page?: number } = {},
) {
  const where = query.status ? eq(orders.status, query.status) : undefined;
  const [totalRow] = await db
    .select({ value: count() })
    .from(orders)
    .where(where);
  const pageCount = Math.max(
    1,
    Math.ceil((totalRow?.value ?? 0) / ADMIN_ORDERS_PAGE_SIZE),
  );
  const page = Math.min(Math.max(1, Math.trunc(query.page ?? 1)), pageCount);
  const items = await db.query.orders.findMany({
    where,
    orderBy: [desc(orders.createdAt), desc(orders.id)],
    limit: ADMIN_ORDERS_PAGE_SIZE,
    offset: (page - 1) * ADMIN_ORDERS_PAGE_SIZE,
    with: { items: { orderBy: asc(orderItems.id) } },
  });
  return { items, page, pageCount };
}

export type OrderTransitionResult =
  | { ok: true }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "invalid_status"; status: OrderStatus };

export async function markOrderShipped(
  db: Database,
  orderId: string,
): Promise<OrderTransitionResult> {
  return db.transaction((tx) => transition(tx, orderId, "paid", "shipped"));
}

// The charge may still be in flight; placeOrder then sees the order is no longer pending and
// leaves it cancelled. A charge that succeeds after the cancel is not refunded here.
export async function cancelOrder(
  db: Database,
  orderId: string,
): Promise<OrderTransitionResult> {
  return db.transaction(async (tx) => {
    const result = await transition(
      tx,
      orderId,
      "pending_payment",
      "cancelled",
    );
    if (result.ok) await returnStock(tx, orderId);
    return result;
  });
}

// The status condition in the update makes concurrent transitions of one order safe: only
// the first matches, and the others see the status it left.
async function transition(
  tx: Transaction,
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
): Promise<OrderTransitionResult> {
  const [updated] = await tx
    .update(orders)
    .set({ status: to })
    .where(and(eq(orders.id, orderId), eq(orders.status, from)))
    .returning({ id: orders.id });
  if (updated) return { ok: true };
  const [current] = await tx
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!current) return { ok: false, reason: "not_found" };
  return { ok: false, reason: "invalid_status", status: current.status };
}
