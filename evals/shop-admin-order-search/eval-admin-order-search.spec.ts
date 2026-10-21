import { expect, test } from "@playwright/test";

test("finds orders by part of the buyer's email, with the status filter", async ({
  page,
}) => {
  const tag = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const email = `Searcher-${tag}@example.com`;
  await page.goto("/products/wooden-spoon-set");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("link", { name: "Check out" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Full name").fill("Sam Searcher");
  await page.getByLabel("Street address").fill("1 Example Street");
  await page.getByLabel("City").fill("Springfield");
  await page.getByLabel("Postal code").fill("12345");
  await page.getByLabel("Card number").fill("4242 4242 4242 4242");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByTestId("order-status")).toHaveText("Paid");

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("admin-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account\/orders$/);

  await page.goto("/admin/orders");
  await page
    .getByLabel("Search by email")
    .fill(`searcher-${tag.toUpperCase()}`);
  await page.getByLabel("Search by email").press("Enter");
  await expect(page).toHaveURL(/[?&]q=/);
  const rows = page.getByTestId("admin-order-row");
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText(email);

  await page.getByRole("link", { name: "Paid" }).click();
  await expect(page).toHaveURL(/status=paid/);
  await expect(page).toHaveURL(/[?&]q=/);
  await expect(rows).toHaveCount(1);
  await page.getByRole("link", { name: "Shipped" }).click();
  await expect(rows).toHaveCount(0);
});
