import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/account/actions";
import { SearchForm } from "@/components/search-form";
import { getDatabase } from "@/db/client";
import { getSessionUser } from "@/lib/auth";
import { countCartItems } from "@/lib/cart";
import { readCartId } from "@/lib/cart-session";
import { listCategories } from "@/lib/catalog";
import "./globals.css";

// Every page reads the catalog at request time, so nothing is prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Kozo Sample Shop", template: "%s · Kozo Sample Shop" },
  description: "A fictional store used to exercise the kozo software factory.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const db = getDatabase();
  const cartId = await readCartId();
  const [categories, cartCount, user] = await Promise.all([
    listCategories(db),
    cartId ? countCartItems(db, cartId) : 0,
    getSessionUser(),
  ]);
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
            <Link href="/" className="text-lg font-semibold text-brand">
              Kozo Sample Shop
            </Link>
            <nav
              aria-label="Categories"
              className="flex flex-wrap gap-3 text-sm"
            >
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="text-stone-600 hover:text-brand"
                >
                  {category.name}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-4">
              <SearchForm />
              <Link
                href="/cart"
                className="text-sm font-medium hover:text-brand"
              >
                Cart (<span data-testid="cart-count">{cartCount}</span>)
              </Link>
              {user ? (
                <>
                  <Link
                    href="/account/orders"
                    className="text-sm hover:text-brand"
                  >
                    Your orders
                  </Link>
                  <form action={signOutAction}>
                    <button type="submit" className="text-sm text-stone-600">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/sign-in" className="text-sm hover:text-brand">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
