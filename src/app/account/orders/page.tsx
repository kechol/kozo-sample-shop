import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db/client";
import { getSessionUser } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/checkout";
import { formatPrice } from "@/lib/money";
import { orderStatusLabels } from "@/lib/order-status";

export const metadata: Metadata = { title: "Your orders" };

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function AccountOrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/account/orders");
  const orders = await listOrdersForUser(getDatabase(), user.id);

  return (
    <>
      <h1 className="text-2xl font-semibold">Your orders</h1>
      <p className="mb-6 text-stone-600">Signed in as {user.email}</p>
      {orders.length === 0 ? (
        <p className="text-stone-600">
          You have no orders yet.{" "}
          <Link href="/" className="text-brand">
            Start shopping
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {orders.map((order) => (
            <li key={order.id} data-testid="order-row">
              <Link
                href={`/orders/${order.id}`}
                className="flex flex-wrap items-center gap-4 p-4 hover:bg-stone-50"
              >
                <span className="w-32 text-sm text-stone-600">
                  {dateFormatter.format(order.createdAt)}
                </span>
                <span className="min-w-48 flex-1 text-sm">
                  {order.items
                    .map((item) => `${item.productName} × ${item.quantity}`)
                    .join(", ")}
                </span>
                <span className="text-sm">
                  {orderStatusLabels[order.status]}
                </span>
                <span className="w-24 text-right font-medium">
                  {formatPrice(order.totalCents)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
