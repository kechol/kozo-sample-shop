import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "../../src/db/client";
import { seed, truncate } from "../../src/db/seed";

// docker-compose.yml publishes the database on KOZO_PORT_1 in a kozo worktree.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  `postgres://shop:shop@localhost:${process.env.KOZO_PORT_1 ?? "5433"}/shop_test`;

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

export async function reseedTestDatabase(
  db: ReturnType<typeof createTestDatabase>,
) {
  await truncate(db);
  await seed(db);
}
