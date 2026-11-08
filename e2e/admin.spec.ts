import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account\/orders$/);
}

// Server Actions accept a POST from anyone who knows the action id, which ships in the page
// bundle, so the test reads it from the build the server runs. The manifest is internal to
// Next.js; update this lookup if an upgrade moves it.
function actionId(exportedName: string) {
  const manifest = JSON.parse(
    readFileSync(".next/server/server-reference-manifest.json", "utf8"),
  ) as { node: Record<string, { exportedName: string }> };
  const entry = Object.entries(manifest.node).find(
    ([, action]) => action.exportedName === exportedName,
  );
  if (!entry) throw new Error(`No action ${exportedName}`);
  return entry[0];
}

// Posts the form the way a browser without JavaScript submits a Server Action form, to a page
// whose bundle includes the action.
async function postAction(
  page: Page,
  exportedName: string,
  fields: Record<string, string>,
) {
  return page.request.post("/admin/orders", {
    multipart: { [`$ACTION_ID_${actionId(exportedName)}`]: "", ...fields },
    maxRedirects: 0,
  });
}

async function buy(page: Page, slug: string, email: string, name: string) {
  await page.goto(`/products/${slug}`);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("link", { name: "Check out" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Street address").fill("1 Example Street");
  await page.getByLabel("City").fill("Springfield");
  await page.getByLabel("Postal code").fill("12345");
  await page.getByLabel("Card number").fill("4242 4242 4242 4242");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByTestId("order-status")).toHaveText("Paid");
}

function uniqueSlug(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test("hides the admin from guests and buyers", async ({ page }) => {
  for (const path of ["/admin", "/admin/orders", "/admin/products/new"]) {
    expect((await page.goto(path))?.status()).toBe(404);
  }
  await signIn(page, "buyer@example.com", "buyer-password-123");
  await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
  for (const path of ["/admin", "/admin/orders", "/admin/products/1/edit"]) {
    expect((await page.goto(path))?.status()).toBe(404);
  }
});

test("ignores a role sent with sign-up", async ({ page, baseURL }) => {
  const email = `${uniqueSlug("role")}@example.com`;
  const response = await page.request.post("/api/auth/sign-up/email", {
    data: { name: "Eve", email, password: "eve-password-123", role: "admin" },
    headers: { origin: new URL(baseURL ?? "").origin },
  });
  expect(response.status()).toBe(200);
  // The sign-up set the session cookie, so this request comes from the new account.
  await page.goto("/account/orders");
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  expect((await page.goto("/admin/orders"))?.status()).toBe(404);
});

test("creates and edits a product, then ships its order", async ({ page }) => {
  const slug = uniqueSlug("desk-lamp");
  await signIn(page, "admin@example.com", "admin-password-123");
  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL(/\/admin\/orders$/);

  await page.getByRole("link", { name: "Products" }).click();
  await page.getByRole("link", { name: "New product" }).click();
  await expect(page).toHaveURL(/\/admin\/products\/new$/);
  await page.getByLabel("Name").fill("Brass Desk Lamp");
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Price (USD)").fill("12.345");
  await page.getByLabel("Stock").fill("");
  await page.getByLabel("Category").selectOption({ label: "Home" });
  await page.getByLabel("Description").fill("A small lamp for a desk.");
  await page.getByRole("button", { name: "Create product" }).click();

  // A rejected form keeps what was typed.
  await expect(page.getByText("Enter a price such as 12.50")).toBeVisible();
  await expect(page.getByText("Enter a whole number")).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveValue("Brass Desk Lamp");
  await expect(page.getByLabel("Category")).not.toHaveValue("");
  await page.getByLabel("Price (USD)").fill("45");
  await page.getByLabel("Stock").fill("3");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);

  await page
    .getByRole("link", { name: "Edit Brass Desk Lamp" })
    .first()
    .click();
  await expect(page.getByLabel("Price (USD)")).toHaveValue("45.00");
  await page.getByLabel("Price (USD)").fill("39.50");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);

  await page.goto(`/products/${slug}`);
  await expect(page.getByText("$39.50")).toBeVisible();
  await buy(page, slug, "admin@example.com", "Sample Admin");

  await page.goto("/admin/orders?status=paid");
  const row = page
    .getByTestId("admin-order-row")
    .filter({ hasText: "Brass Desk Lamp × 1" });
  await row.getByRole("button", { name: "Mark shipped" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "The order was marked shipped.",
  );
  await expect(page).toHaveURL(/status=paid/);

  await page.goto("/admin/orders?status=shipped");
  await expect(
    page
      .getByTestId("admin-order-row")
      .filter({ hasText: "Brass Desk Lamp × 1" })
      .getByTestId("admin-order-status"),
  ).toHaveText("Shipped");
});

test("refuses an admin action posted by a buyer", async ({ page, browser }) => {
  await signIn(page, "buyer@example.com", "buyer-password-123");
  await buy(page, "wool-socks", "buyer@example.com", "Sample Buyer");
  const orderId = page.url().split("/").pop() ?? "";

  const refused = await postAction(page, "markShippedAction", { orderId });
  expect(refused.status()).toBe(404);
  await page.reload();
  await expect(page.getByTestId("order-status")).toHaveText("Paid");

  // The same request from an admin ships the order, so the refusal above came from the role.
  const admin = await browser.newPage();
  await signIn(admin, "admin@example.com", "admin-password-123");
  const shipped = await postAction(admin, "markShippedAction", { orderId });
  expect(shipped.status()).toBe(303);
  await page.reload();
  await expect(page.getByTestId("order-status")).toHaveText("Shipped");
  await expect(
    page.getByRole("heading", { name: "Thank you for your order" }),
  ).toBeVisible();
  await admin.close();
});

test("creates a product without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const slug = uniqueSlug("no-js");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("admin-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account\/orders$/);

  await page.goto("/admin/products/new");
  await page.getByLabel("Name").fill("Paper Lantern");
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Price (USD)").fill("18");
  await page.getByLabel("Stock").fill("4");
  await page.getByLabel("Category").selectOption({ label: "Home" });
  await page.getByLabel("Description").fill("A folding lantern.");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await expect(page.getByText("Paper Lantern").first()).toBeVisible();
  await context.close();
});
