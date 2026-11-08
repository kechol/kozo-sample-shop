import { afterAll, describe, expect, it } from "vitest";
import { seedProducts } from "@/db/seed-data";
import {
  getCategory,
  getProduct,
  listProducts,
  PAGE_SIZE,
} from "@/lib/catalog";
import { createTestDatabase } from "../support/database";

const db = createTestDatabase();

afterAll(async () => {
  await db.$client.end();
});

describe("listProducts", () => {
  it("pages through every product in name order", async () => {
    const first = await listProducts(db);
    expect(first.total).toBe(seedProducts.length);
    expect(first.items).toHaveLength(PAGE_SIZE);
    expect(first.pageCount).toBe(Math.ceil(seedProducts.length / PAGE_SIZE));

    const names = first.items.map((item) => item.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));

    const last = await listProducts(db, { page: first.pageCount });
    expect(last.items).toHaveLength(
      seedProducts.length - PAGE_SIZE * (first.pageCount - 1),
    );
  });

  it("clamps a page beyond the last one", async () => {
    const result = await listProducts(db, { page: 999 });
    expect(result.page).toBe(result.pageCount);
  });

  it("filters by category", async () => {
    const result = await listProducts(db, { categorySlug: "coffee" });
    const expected = seedProducts.filter((p) => p.category === "coffee");
    expect(result.total).toBe(expected.length);
    expect(
      result.items.every((item) => item.categoryName === "Coffee & Tea"),
    ).toBe(true);
  });

  it("searches names and descriptions case-insensitively", async () => {
    const byName = await listProducts(db, { search: "KETTLE" });
    expect(byName.items.map((item) => item.slug)).toEqual(["gooseneck-kettle"]);

    const byDescription = await listProducts(db, { search: "merino" });
    expect(byDescription.items.map((item) => item.slug)).toEqual([
      "wool-socks",
    ]);
  });

  it("treats LIKE wildcards in the search term literally", async () => {
    const result = await listProducts(db, { search: "%" });
    expect(result.total).toBe(0);
  });

  it("marks products without stock as sold out", async () => {
    const result = await listProducts(db, { search: "Travel Tumbler" });
    expect(result.items[0]?.inStock).toBe(false);
  });
});

describe("getProduct", () => {
  it("returns the product with its category", async () => {
    const product = await getProduct(db, "hand-grinder");
    expect(product?.category.slug).toBe("coffee");
  });

  it("returns null for an unknown slug", async () => {
    expect(await getProduct(db, "does-not-exist")).toBeNull();
  });
});

describe("getCategory", () => {
  it("returns null for an unknown slug", async () => {
    expect(await getCategory(db, "does-not-exist")).toBeNull();
  });
});
