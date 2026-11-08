import Link from "next/link";
import type { ProductSummary } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";

export function ProductGrid({ products }: { products: ProductSummary[] }) {
  if (products.length === 0) {
    return <p className="text-stone-600">No products found.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.slug}>
          <Link
            href={`/products/${product.slug}`}
            className="block h-full rounded-lg border border-stone-200 bg-white p-4 hover:border-brand"
          >
            <div
              aria-hidden="true"
              className="mb-3 flex aspect-square items-center justify-center rounded bg-brand-soft text-3xl font-semibold text-brand"
            >
              {product.name.charAt(0)}
            </div>
            <p className="text-xs uppercase tracking-wide text-stone-500">
              {product.categoryName}
            </p>
            <h2 className="font-medium">{product.name}</h2>
            <p className="mt-1 text-sm">
              {formatPrice(product.priceCents)}
              {!product.inStock && (
                <span className="ml-2 text-red-700">Sold out</span>
              )}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
