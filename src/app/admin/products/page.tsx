import type { Metadata } from "next";
import Link from "next/link";
import { getDatabase } from "@/db/client";
import { listProductsForAdmin } from "@/lib/admin/products";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/money";

export const metadata: Metadata = { title: "Products · Admin" };

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await listProductsForAdmin(getDatabase());
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded bg-brand px-3 py-1 text-sm text-white"
        >
          New product
        </Link>
      </div>
      <table className="w-full rounded-lg border border-stone-200 bg-white text-sm">
        <thead className="text-left text-stone-600">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Category</th>
            <th className="p-2 text-right">Price</th>
            <th className="p-2 text-right">Stock</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {products.map((product) => (
            <tr key={product.id} data-testid="admin-product-row">
              <td className="p-2">{product.name}</td>
              <td className="p-2">{product.categoryName}</td>
              <td className="p-2 text-right">
                {formatPrice(product.priceCents)}
              </td>
              <td className="p-2 text-right">{product.stock}</td>
              <td className="p-2 text-right">
                <Link
                  href={`/admin/products/${product.id}/edit`}
                  className="text-brand"
                  aria-label={`Edit ${product.name}`}
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
