import type { Metadata } from "next";
import { Pagination } from "@/components/pagination";
import { ProductGrid } from "@/components/product-grid";
import { getDatabase } from "@/db/client";
import { listProducts } from "@/lib/catalog";
import { firstParam, pageParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const { q, page } = await searchParams;
  const term = firstParam(q)?.trim() ?? "";
  if (!term) {
    return (
      <>
        <h1 className="mb-6 text-2xl font-semibold">Search</h1>
        <p className="text-stone-600">Enter a word to search the catalog.</p>
      </>
    );
  }
  const result = await listProducts(getDatabase(), {
    search: term,
    page: pageParam(page),
  });
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">
        {result.total} {result.total === 1 ? "result" : "results"} for “{term}”
      </h1>
      <ProductGrid products={result.items} />
      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        basePath="/search"
        params={{ q: term }}
      />
    </>
  );
}
