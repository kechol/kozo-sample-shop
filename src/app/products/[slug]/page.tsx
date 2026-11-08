import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartForm } from "@/components/add-to-cart-form";
import { getDatabase } from "@/db/client";
import { getProduct } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(getDatabase(), slug);
  return { title: product?.name ?? "Product not found" };
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(getDatabase(), slug);
  if (!product) notFound();
  return (
    <article className="grid gap-8 md:grid-cols-2">
      <div
        aria-hidden="true"
        className="flex aspect-square items-center justify-center rounded-lg bg-brand-soft text-7xl font-semibold text-brand"
      >
        {product.name.charAt(0)}
      </div>
      <div>
        <Link
          href={`/categories/${product.category.slug}`}
          className="text-sm uppercase tracking-wide text-stone-500 hover:text-brand"
        >
          {product.category.name}
        </Link>
        <h1 className="mt-1 text-3xl font-semibold">{product.name}</h1>
        <p className="mt-2 text-xl">{formatPrice(product.priceCents)}</p>
        <p className="mt-4 text-stone-700">{product.description}</p>
        <p className="mt-4 text-sm" data-testid="stock">
          {product.stock > 0 ? `${product.stock} in stock` : "Sold out"}
        </p>
        {product.stock > 0 && (
          <AddToCartForm productId={product.id} stock={product.stock} />
        )}
      </div>
    </article>
  );
}
