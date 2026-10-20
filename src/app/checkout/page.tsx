import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db/client";
import { getCart } from "@/lib/cart";
import { readCartId } from "@/lib/cart-session";
import { formatPrice } from "@/lib/money";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const cartId = await readCartId();
  const cart = cartId ? await getCart(getDatabase(), cartId) : null;
  if (!cart || cart.lines.length === 0) redirect("/cart");

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <section>
        <h1 className="mb-6 text-2xl font-semibold">Checkout</h1>
        <CheckoutForm />
      </section>
      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="mb-4 text-lg font-semibold">
          Order summary
        </h2>
        <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {cart.lines.map((line) => (
            <li
              key={line.productId}
              className="flex justify-between p-3 text-sm"
            >
              <span>
                {line.name} × {line.quantity}
              </span>
              <span>{formatPrice(line.unitPriceCents * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-right text-lg">
          Total:{" "}
          <span data-testid="total">{formatPrice(cart.subtotalCents)}</span>
        </p>
      </section>
    </div>
  );
}
