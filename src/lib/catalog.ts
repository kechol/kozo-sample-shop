import { and, asc, count, eq, ilike, or, type SQL } from "drizzle-orm";
import type { Database } from "@/db/client";
import { categories, products } from "@/db/schema";

export const PAGE_SIZE = 12;

export type ProductQuery = {
  categorySlug?: string;
  search?: string;
  page?: number;
};

export type ProductSummary = {
  slug: string;
  name: string;
  priceCents: number;
  inStock: boolean;
  categoryName: string;
};

export type ProductPage = {
  items: ProductSummary[];
  page: number;
  pageCount: number;
  total: number;
};

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function listProducts(
  db: Database,
  query: ProductQuery = {},
): Promise<ProductPage> {
  const conditions: SQL[] = [];
  if (query.categorySlug) {
    conditions.push(eq(categories.slug, query.categorySlug));
  }
  const term = query.search?.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    const match = or(
      ilike(products.name, pattern),
      ilike(products.description, pattern),
    );
    if (match) conditions.push(match);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ value: count() })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where);
  const total = totalRow?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.trunc(query.page ?? 1)), pageCount);

  const rows = await db
    .select({
      slug: products.slug,
      name: products.name,
      priceCents: products.priceCents,
      stock: products.stock,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(asc(products.name), asc(products.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return {
    items: rows.map(({ stock, ...row }) => ({ ...row, inStock: stock > 0 })),
    page,
    pageCount,
    total,
  };
}

export async function getProduct(db: Database, slug: string) {
  const row = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: { category: true },
  });
  return row ?? null;
}

export async function listCategories(db: Database) {
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function getCategory(db: Database, slug: string) {
  const row = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });
  return row ?? null;
}
