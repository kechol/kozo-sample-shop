import { expect, test } from "@playwright/test";

test("keeps the line when the quantity box is left blank", async ({ page }) => {
  await page.goto("/products/bamboo-cutting-board");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  const quantity = page.getByLabel("Quantity of Bamboo Cutting Board");
  await quantity.fill("");
  await page.getByRole("button", { name: "Update" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Enter a quantity between 0 and 99." }),
  ).toBeVisible();
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
  await expect(quantity).toHaveValue("1");

  // Zero still removes the line, as before.
  await quantity.fill("0");
  await page.getByRole("button", { name: "Update" }).click();
  await expect(page.getByTestId("cart-line")).toHaveCount(0);
});
