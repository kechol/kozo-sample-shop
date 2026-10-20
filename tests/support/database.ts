import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "../../src/db/client";
import { seed, truncate } from "../../src/db/seed";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://shop:shop@localhost:5433/shop_test";

export function createTestDatabase() {
  return createDatabase(TEST_DATABASE_URL);
}

export async function resetTestDatabase() {
  const db = createTestDatabase();
  await migrate(db, { migrationsFolder: "drizzle" });
  await truncate(db);
  await seed(db);
  await db.$client.end();
}
