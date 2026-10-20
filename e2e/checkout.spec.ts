import { expect, type Page, test } from "@playwright/test";

// Each test buys a different product, so parallel tests never compete for stock.
async function addToCart(page: Page, slug: string, quantity = 1) {
  await page.goto(`/products/${slug}`);
  await page.getByLabel("Quantity").fill(String(quantity));
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
}

async function fillCheckout(page: Page, cardNumber: string) {
  await page.getByRole("link", { name: "Check out" }).click();
  await page.getByLabel("Email").fill("buyer@example.com");
  await page.getByLabel("Full name").fill("Alex Example");
  await page.getByLabel("Street address").fill("1 Example Street");
  await page.getByLabel("City").fill("Springfield");
  await page.getByLabel("Postal code").fill("12345");
  await page.getByLabel("Country").selectOption("CA");
  await page.getByLabel("Card number").fill(cardNumber);
}

test("buys a product with the success card", async ({ page }) => {
  await addToCart(page, "gooseneck-kettle", 2);
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
  await expect(page.getByTestId("subtotal")).toHaveText("$108.00");
  await expect(page.getByTestId("cart-count")).toHaveText("2");

  await fillCheckout(page, "4242 4242 4242 4242");
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { name: "Thank you for your order" }),
  ).toBeVisible();
  await expect(page.getByTestId("order-status")).toHaveText("Paid");
  await expect(page.getByTestId("order-total")).toHaveText("$108.00");
  await expect(page.getByTestId("cart-count")).toHaveText("0");

  await page.goto("/products/gooseneck-kettle");
  await expect(page.getByTestId("stock")).toHaveText("12 in stock");
});

test("shows a decline and keeps the cart", async ({ page }) => {
  await addToCart(page, "fountain-pen");
  await fillCheckout(page, "4000 0000 0000 0002");
  await page.getByRole("button", { name: "Place order" }).click();

  // Next.js renders its own route announcer with role="alert", so match by text.
  await expect(
    page.getByRole("alert").filter({ hasText: "declined" }),
  ).toHaveText("Your card was declined. Try another card.");
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  await page.goto("/products/fountain-pen");
  await expect(page.getByTestId("stock")).toHaveText("16 in stock");
});

test("shows progress while a slow payment completes", async ({ page }) => {
  await addToCart(page, "camp-stove");
  await fillCheckout(page, "4000 0000 0000 0077");
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(
    page.getByRole("button", { name: "Processing…" }),
  ).toBeDisabled();
  await expect(page.getByTestId("order-status")).toHaveText("Paid");
});

test("validates the checkout form", async ({ page }) => {
  await addToCart(page, "washi-tape-set");
  await fillCheckout(page, "4242 4242 4242 4241");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await expect(page.getByText("Enter a valid card number")).toBeVisible();
});

test("updates and removes cart lines", async ({ page }) => {
  await addToCart(page, "soy-candle");
  await page.getByLabel("Quantity of Soy Candle — Cedar").fill("3");
  await page.getByRole("button", { name: "Update" }).click();
  await expect(page.getByTestId("subtotal")).toHaveText("$60.00");

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
});

test("offers no add-to-cart button for a sold-out product", async ({
  page,
}) => {
  await page.goto("/products/cotton-doormat");
  await expect(page.getByTestId("stock")).toHaveText("Sold out");
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(
    0,
  );
});

test("sends an empty cart from checkout back to the cart", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/cart$/);
});
