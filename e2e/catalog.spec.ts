import { expect, test } from "@playwright/test";

test("browses from the home page to a product", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "All products" }),
  ).toBeVisible();

  await page.getByRole("link", { name: /Bamboo Cutting Board/ }).click();
  await expect(page).toHaveURL(/\/products\/bamboo-cutting-board$/);
  await expect(
    page.getByRole("heading", { name: "Bamboo Cutting Board" }),
  ).toBeVisible();
  await expect(page.getByText("$24.00")).toBeVisible();
  await expect(page.getByTestId("stock")).toHaveText("40 in stock");
});

test("filters by category from the header", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Categories" })
    .getByRole("link", { name: "Coffee & Tea" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Coffee & Tea" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Gooseneck Kettle/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Daypack 20L/ })).toHaveCount(0);
});

test("searches the catalog", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search products" }).fill("kettle");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/search\?q=kettle/);
  await expect(
    page.getByRole("heading", { name: "1 result for “kettle”" }),
  ).toBeVisible();
});

test("pages through the catalog", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Pagination" })
    .getByRole("link", { name: "Next" })
    .click();
  await expect(page).toHaveURL(/\?page=2$/);
  await expect(page.getByText("Page 2 of 3")).toBeVisible();
});

test("shows sold-out products", async ({ page }) => {
  await page.goto("/products/travel-tumbler");
  await expect(page.getByTestId("stock")).toHaveText("Sold out");
});

test("returns 404 for an unknown product", async ({ page }) => {
  const response = await page.goto("/products/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
});
