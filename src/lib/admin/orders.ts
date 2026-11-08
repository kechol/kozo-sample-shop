import { asc, count, desc, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { type OrderStatus, orderItems, orders } from "@/db/schema";
import {
  type OrderTransitionResult,
  transitionOrder,
} from "@/lib/order-transitions";
import { pageWindow } from "@/lib/pagination";

const PAGE_SIZE = 20;

export async function listOrdersForAdmin(
  db: Database,
  query: { status?: OrderStatus; page?: number } = {},
) {
  const where = query.status ? eq(orders.status, query.status) : undefined;
  const [totalRow] = await db
    .select({ value: count() })
    .from(orders)
    .where(where);
  const { page, pageCount, offset } = pageWindow(
    totalRow?.value ?? 0,
    PAGE_SIZE,
    query.page,
  );
  const items = await db.query.orders.findMany({
    where,
    orderBy: [desc(orders.createdAt), desc(orders.id)],
    limit: PAGE_SIZE,
    offset,
    with: { items: { orderBy: asc(orderItems.id) } },
  });
  return { items, page, pageCount };
}

export async function markOrderShipped(
  db: Database,
  orderId: string,
): Promise<OrderTransitionResult> {
  return db.transaction((tx) =>
    transitionOrder(tx, orderId, "paid", "shipped"),
  );
}

// The charge may still be in flight; placeOrder then sees the order is no longer pending and
// leaves it cancelled. A charge that succeeds after the cancel is not refunded here.
export async function cancelOrder(
  db: Database,
  orderId: string,
): Promise<OrderTransitionResult> {
  return db.transaction((tx) =>
    transitionOrder(tx, orderId, "pending_payment", "cancelled"),
  );
}
