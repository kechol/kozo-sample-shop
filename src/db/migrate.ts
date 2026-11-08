import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "./client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const db = createDatabase(url);
await migrate(db, { migrationsFolder: "drizzle" });
await db.$client.end();
