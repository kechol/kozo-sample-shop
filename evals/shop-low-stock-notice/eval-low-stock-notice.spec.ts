import { expect, test } from "@playwright/test";

test("tells buyers how many are left when three or fewer remain", async ({
  page,
}) => {
  await page.goto("/products/insulated-bottle");
  await expect(page.getByTestId("stock")).toHaveText("Only 3 left");
  await page.goto("/products/hand-grinder");
  await expect(page.getByTestId("stock")).toHaveText("9 in stock");
  await page.goto("/products/travel-tumbler");
  await expect(page.getByTestId("stock")).toHaveText("Sold out");
});
