import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/pagination";
import { ProductGrid } from "@/components/product-grid";
import { getDatabase } from "@/db/client";
import { getCategory, listProducts } from "@/lib/catalog";
import { pageParam } from "@/lib/search-params";

export async function generateMetadata({
  params,
}: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(getDatabase(), slug);
  return { title: category?.name ?? "Category not found" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const { page } = await searchParams;
  const db = getDatabase();
  const category = await getCategory(db, slug);
  if (!category) notFound();
  const result = await listProducts(db, {
    categorySlug: category.slug,
    page: pageParam(page),
  });
  return (
    <>
      <h1 className="text-2xl font-semibold">{category.name}</h1>
      <p className="mb-6 text-stone-600">{category.description}</p>
      <ProductGrid products={result.items} />
      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        basePath={`/categories/${category.slug}`}
      />
    </>
  );
}
