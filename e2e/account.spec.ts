import { expect, type Page, test } from "@playwright/test";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function buy(page: Page, slug: string) {
  await page.goto(`/products/${slug}`);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("link", { name: "Check out" }).click();
  await page.getByLabel("Email").fill("buyer@example.com");
  await page.getByLabel("Full name").fill("Sample Buyer");
  await page.getByLabel("Street address").fill("1 Example Street");
  await page.getByLabel("City").fill("Springfield");
  await page.getByLabel("Postal code").fill("12345");
  await page.getByLabel("Card number").fill("4242 4242 4242 4242");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByTestId("order-status")).toHaveText("Paid");
}

test("signs up, signs out and signs back in", async ({ page }) => {
  const email = `new-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("New Buyer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("new-buyer-password");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/account\/orders$/);
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await expect(page.getByText("You have no orders yet.")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await signIn(page, email, "new-buyer-password");
  await expect(page).toHaveURL(/\/account\/orders$/);
});

test("rejects a wrong password", async ({ page }) => {
  await signIn(page, "buyer@example.com", "not-the-password");
  await expect(
    page.getByRole("alert").filter({ hasText: "Incorrect" }),
  ).toHaveText("Incorrect email or password.");
});

test("sends a signed-out visitor from order history to sign in and back", async ({
  page,
}) => {
  await page.goto("/account/orders");
  await expect(page).toHaveURL(/\/sign-in\?next=\/account\/orders$/);
  await page.getByLabel("Email").fill("buyer@example.com");
  await page.getByLabel("Password").fill("buyer-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account\/orders$/);
});

test("lists a signed-in purchase in the buyer's history only", async ({
  page,
  browser,
}) => {
  await signIn(page, "buyer@example.com", "buyer-password-123");
  await expect(page).toHaveURL(/\/account\/orders$/);
  await buy(page, "ceramic-vase");
  const orderUrl = page.url();

  await page.goto("/account/orders");
  const row = page
    .getByTestId("order-row")
    .filter({ hasText: "Ceramic Bud Vase × 1" });
  await expect(row).toHaveCount(1);

  // The owner can open the order from a fresh browser once signed in.
  const ownerElsewhere = await browser.newPage();
  await signIn(ownerElsewhere, "buyer@example.com", "buyer-password-123");
  await expect(ownerElsewhere).toHaveURL(/\/account\/orders$/);
  await ownerElsewhere.goto(orderUrl);
  await expect(ownerElsewhere.getByTestId("order-status")).toHaveText("Paid");
  await ownerElsewhere.close();

  const otherBuyer = await browser.newPage();
  await signIn(otherBuyer, "admin@example.com", "admin-password-123");
  await expect(otherBuyer).toHaveURL(/\/account\/orders$/);
  await expect(otherBuyer.getByText("Ceramic Bud Vase")).toHaveCount(0);
  const response = await otherBuyer.goto(orderUrl);
  expect(response?.status()).toBe(404);
  await otherBuyer.close();
});
