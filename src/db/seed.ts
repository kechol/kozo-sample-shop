import { sql } from "drizzle-orm";
import { createDatabase, type Database } from "./client";
import { categories, products } from "./schema";
import { seedCategories, seedProducts } from "./seed-data";

export async function seed(db: Database) {
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(categories)
      .values([...seedCategories])
      .returning({ id: categories.id, slug: categories.slug });
    const idBySlug = new Map(inserted.map((c) => [c.slug, c.id]));
    await tx.insert(products).values(
      seedProducts.map(({ category, ...product }) => {
        const categoryId = idBySlug.get(category);
        if (categoryId === undefined)
          throw new Error(`Unknown category ${category}`);
        return { ...product, categoryId };
      }),
    );
  });
}

export async function truncate(db: Database) {
  await db.execute(sql`TRUNCATE products, categories RESTART IDENTITY CASCADE`);
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = createDatabase(url);
  await truncate(db);
  await seed(db);
  await db.$client.end();
}
