import { asc, eq } from "drizzle-orm";
import type { Database, Transaction } from "@/db/client";
import { categories, products } from "@/db/schema";

export type ProductInput = {
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  stock: number;
  categoryId: number;
};

export type SaveProductResult =
  | { ok: true; id: number }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "slug_taken" }
  | { ok: false; reason: "unknown_category" }
  | { ok: false; reason: "stock_changed"; currentStock: number };

export async function listProductsForAdmin(db: Database) {
  return db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      priceCents: products.priceCents,
      stock: products.stock,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.name), asc(products.id));
}

export async function getProductById(db: Database, id: number) {
  const [row] = await db.select().from(products).where(eq(products.id, id));
  return row ?? null;
}

export async function createProduct(
  db: Database,
  input: ProductInput,
): Promise<SaveProductResult> {
  return catchSlugTaken(() =>
    db.transaction(async (tx): Promise<SaveProductResult> => {
      if (!(await categoryExists(tx, input.categoryId))) {
        return { ok: false, reason: "unknown_category" };
      }
      const [row] = await tx
        .insert(products)
        .values(input)
        .returning({ id: products.id });
      if (!row) throw new Error("Failed to create the product");
      return { ok: true, id: row.id };
    }),
  );
}

// expectedStock is the stock the admin saw when the form opened. Checkouts take stock
// meanwhile, so the stock is written only when the admin changed it, and only if nobody
// else did; otherwise saving would undo those sales and oversell.
export async function updateProduct(
  db: Database,
  id: number,
  input: ProductInput,
  expectedStock: number,
): Promise<SaveProductResult> {
  return catchSlugTaken(() =>
    db.transaction(async (tx): Promise<SaveProductResult> => {
      const [current] = await tx
        .select({ stock: products.stock })
        .from(products)
        .where(eq(products.id, id))
        .for("update");
      if (!current) return { ok: false, reason: "not_found" };
      const stockEdited = input.stock !== expectedStock;
      if (stockEdited && current.stock !== expectedStock) {
        return {
          ok: false,
          reason: "stock_changed",
          currentStock: current.stock,
        };
      }
      if (!(await categoryExists(tx, input.categoryId))) {
        return { ok: false, reason: "unknown_category" };
      }
      await tx
        .update(products)
        .set({ ...input, stock: stockEdited ? input.stock : current.stock })
        .where(eq(products.id, id));
      return { ok: true, id };
    }),
  );
}

async function categoryExists(tx: Transaction, categoryId: number) {
  const [row] = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, categoryId));
  return row !== undefined;
}

async function catchSlugTaken(
  save: () => Promise<SaveProductResult>,
): Promise<SaveProductResult> {
  try {
    return await save();
  } catch (error) {
    // Drizzle wraps the postgres.js error, which names the violated constraint.
    const cause = (
      error as { cause?: { code?: string; constraint_name?: string } }
    ).cause;
    if (
      cause?.code === "23505" &&
      cause.constraint_name === "products_slug_unique"
    ) {
      return { ok: false, reason: "slug_taken" };
    }
    throw error;
  }
}
