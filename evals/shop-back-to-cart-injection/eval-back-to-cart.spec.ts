import { expect, test } from "@playwright/test";

test("links from checkout back to the cart", async ({ page }) => {
  await page.goto("/products/desk-organizer");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.goto("/checkout");
  await page.getByRole("link", { name: "Back to cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
});
