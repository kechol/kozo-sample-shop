import type { Metadata } from "next";
import Link from "next/link";
import { getDatabase } from "@/db/client";
import { getCart } from "@/lib/cart";
import { readCartId } from "@/lib/cart-session";
import { formatPrice } from "@/lib/money";
import { firstParam } from "@/lib/search-params";
import { removeCartLineAction, updateCartLineAction } from "./actions";

export const metadata: Metadata = { title: "Cart" };

const errorMessages: Record<string, string> = {
  out_of_stock: "That product is sold out.",
  not_found: "That product is no longer available.",
  invalid: "Something was wrong with that request. Please try again.",
};

export default async function CartPage({ searchParams }: PageProps<"/cart">) {
  const error = firstParam((await searchParams).error);
  const cartId = await readCartId();
  const cart = cartId ? await getCart(getDatabase(), cartId) : null;

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Cart</h1>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded bg-red-50 px-3 py-2 text-red-800"
        >
          {errorMessages[error] ?? errorMessages.invalid}
        </p>
      )}
      {!cart || cart.lines.length === 0 ? (
        <p className="text-stone-600">
          Your cart is empty.{" "}
          <Link href="/" className="text-brand">
            Continue shopping
          </Link>
        </p>
      ) : (
        <>
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {cart.lines.map((line) => (
              <li
                key={line.productId}
                className="flex flex-wrap items-center gap-4 p-4"
                data-testid="cart-line"
              >
                <Link
                  href={`/products/${line.slug}`}
                  className="min-w-48 flex-1 font-medium"
                >
                  {line.name}
                </Link>
                <span className="text-sm text-stone-600">
                  {formatPrice(line.unitPriceCents)} each
                </span>
                <form
                  action={updateCartLineAction}
                  className="flex items-center gap-2"
                >
                  <input
                    type="hidden"
                    name="productId"
                    value={line.productId}
                  />
                  <label
                    className="sr-only"
                    htmlFor={`quantity-${line.productId}`}
                  >
                    Quantity of {line.name}
                  </label>
                  <input
                    id={`quantity-${line.productId}`}
                    name="quantity"
                    type="number"
                    min={0}
                    max={Math.min(line.stock, 99)}
                    defaultValue={line.quantity}
                    className="w-16 rounded border border-stone-300 px-2 py-1"
                  />
                  <button type="submit" className="text-sm text-brand">
                    Update
                  </button>
                </form>
                <form action={removeCartLineAction}>
                  <input
                    type="hidden"
                    name="productId"
                    value={line.productId}
                  />
                  <button type="submit" className="text-sm text-red-700">
                    Remove
                  </button>
                </form>
                <span className="w-24 text-right font-medium">
                  {formatPrice(line.unitPriceCents * line.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-end gap-6">
            <p className="text-lg">
              Subtotal:{" "}
              <span data-testid="subtotal">
                {formatPrice(cart.subtotalCents)}
              </span>
            </p>
            <Link
              href="/checkout"
              className="rounded bg-brand px-4 py-2 text-white"
            >
              Check out
            </Link>
          </div>
        </>
      )}
    </>
  );
}
