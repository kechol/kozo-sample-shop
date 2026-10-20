import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import type { OrderStatus } from "@/db/schema";
import { getOrder } from "@/lib/checkout";
import { formatPrice } from "@/lib/money";

export const metadata: Metadata = { title: "Order" };

const statusLabels: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  payment_failed: "Payment failed",
};

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const order = await getOrder(getDatabase(), id);
  if (!order) notFound();

  return (
    <>
      <h1 className="text-2xl font-semibold">
        {order.status === "paid" ? "Thank you for your order" : "Order"}
      </h1>
      <p className="mt-2 text-stone-600">
        Status:{" "}
        <span data-testid="order-status">{statusLabels[order.status]}</span>
      </p>
      <ul className="mt-6 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between p-3 text-sm">
            <span>
              {item.productName} × {item.quantity}
            </span>
            <span>{formatPrice(item.unitPriceCents * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-right text-lg">
        Total:{" "}
        <span data-testid="order-total">{formatPrice(order.totalCents)}</span>
      </p>
      <p className="mt-6 text-sm text-stone-600">
        Shipping to {order.shippingName}, {order.shippingAddress},{" "}
        {order.shippingCity} {order.shippingPostalCode}, {order.shippingCountry}
      </p>
    </>
  );
}
