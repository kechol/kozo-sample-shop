import { Pagination } from "@/components/pagination";
import { ProductGrid } from "@/components/product-grid";
import { getDatabase } from "@/db/client";
import { listProducts } from "@/lib/catalog";
import { pageParam } from "@/lib/search-params";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { page } = await searchParams;
  const result = await listProducts(getDatabase(), { page: pageParam(page) });
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">All products</h1>
      <ProductGrid products={result.items} />
      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        basePath="/"
      />
    </>
  );
}
