import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";
import { createDatabase, type Database } from "./client";
import { accounts, categories, products, users } from "./schema";
import { seedAccounts, seedCategories, seedProducts } from "./seed-data";

// Hashing is deliberately slow, and tests reseed before every case, so hash once per process.
let passwordHashes: Promise<string[]> | undefined;
function hashSeedPasswords() {
  passwordHashes ??= Promise.all(
    seedAccounts.map((account) => hashPassword(account.password)),
  );
  return passwordHashes;
}

export async function seed(db: Database) {
  const hashes = await hashSeedPasswords();
  await db.transaction(async (tx) => {
    for (const [index, account] of seedAccounts.entries()) {
      const userId = randomUUID();
      await tx.insert(users).values({
        id: userId,
        name: account.name,
        email: account.email,
        emailVerified: true,
        role: account.role,
      });
      // better-auth stores email and password sign-in as a "credential" account.
      await tx.insert(accounts).values({
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: hashes[index],
      });
    }

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
  await db.execute(
    sql`TRUNCATE order_items, orders, cart_items, carts, products, categories, verifications, accounts, sessions, users RESTART IDENTITY CASCADE`,
  );
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = createDatabase(url);
  await truncate(db);
  await seed(db);
  await db.$client.end();
}
