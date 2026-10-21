import type { Metadata } from "next";
import Link from "next/link";
import { cancelOrderAction, markShippedAction } from "@/app/admin/actions";
import { Pagination } from "@/components/pagination";
import { getDatabase } from "@/db/client";
import { type OrderStatus, orderStatus } from "@/db/schema";
import { listOrdersForAdmin } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/money";
import { orderStatusLabels } from "@/lib/order-status";
import { firstParam, pageParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Orders · Admin" };

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

// Fixed messages keyed by code, so the notice parameter cannot put arbitrary text on the page.
const notices: Record<string, { text: string; error: boolean }> = {
  shipped: { text: "The order was marked shipped.", error: false },
  cancelled: {
    text: "The order was cancelled and its stock returned.",
    error: false,
  },
  invalid_status: {
    text: "The order changed before your action; check its status.",
    error: true,
  },
  not_found: { text: "That order does not exist.", error: true },
};

function isOrderStatus(value: string | undefined): value is OrderStatus {
  return orderStatus.enumValues.some((status) => status === value);
}

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  await requireAdmin();
  const params = await searchParams;
  const statusParam = firstParam(params.status);
  const status = isOrderStatus(statusParam) ? statusParam : undefined;
  const notice = notices[firstParam(params.notice) ?? ""];
  const { items, page, pageCount } = await listOrdersForAdmin(getDatabase(), {
    status,
    page: pageParam(params.page),
  });

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Orders</h1>
      {notice && (
        <p
          role={notice.error ? "alert" : "status"}
          className={`mb-4 rounded px-3 py-2 ${notice.error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}
        >
          {notice.text}
        </p>
      )}
      <nav
        aria-label="Order status"
        className="mb-4 flex flex-wrap gap-3 text-sm"
      >
        <Link
          href="/admin/orders"
          aria-current={status ? undefined : "page"}
          className={status ? "text-brand" : "font-semibold"}
        >
          All
        </Link>
        {orderStatus.enumValues.map((value) => (
          <Link
            key={value}
            href={`/admin/orders?status=${value}`}
            aria-current={status === value ? "page" : undefined}
            className={status === value ? "font-semibold" : "text-brand"}
          >
            {orderStatusLabels[value]}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <p className="text-stone-600">No orders.</p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {items.map((order) => (
            <li
              key={order.id}
              data-testid="admin-order-row"
              className="flex flex-wrap items-start gap-4 p-4 text-sm"
            >
              <div className="w-40 text-stone-600">
                {dateFormatter.format(order.createdAt)}
              </div>
              <div className="min-w-48 flex-1">
                <p>{order.email}</p>
                <p className="text-stone-600">
                  {order.shippingName}, {order.shippingCity},{" "}
                  {order.shippingCountry}
                </p>
                <p>
                  {order.items
                    .map((item) => `${item.productName} × ${item.quantity}`)
                    .join(", ")}
                </p>
              </div>
              <div className="w-48" data-testid="admin-order-status">
                {orderStatusLabels[order.status]}
              </div>
              <div className="w-24 text-right font-medium">
                {formatPrice(order.totalCents)}
              </div>
              <div className="w-32 text-right">
                {order.status === "paid" && (
                  <form action={markShippedAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="status" value={status ?? ""} />
                    <button type="submit" className="text-brand">
                      Mark shipped
                    </button>
                  </form>
                )}
                {order.status === "pending_payment" && (
                  <form action={cancelOrderAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="status" value={status ?? ""} />
                    <button type="submit" className="text-red-700">
                      Cancel order
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pageCount={pageCount}
        basePath="/admin/orders"
        params={status ? { status } : {}}
      />
    </>
  );
}
