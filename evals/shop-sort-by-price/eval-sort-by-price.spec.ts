import { expect, type Page, test } from "@playwright/test";

async function cards(page: Page) {
  const texts = await page.locator("main ul > li").allInnerTexts();
  return texts.map((text) => ({
    name:
      text
        .split("\n")
        .find((line) => line.trim() && !/^[A-Z &]+$/.test(line.trim())) ?? "",
    price: Number(
      (/\$([\d,]+\.\d{2})/.exec(text)?.[1] ?? "NaN").replace(/,/g, ""),
    ),
  }));
}

test("sorts a category by price both ways and keeps name order by default", async ({
  page,
}) => {
  await page.goto("/categories/kitchen?sort=price-asc");
  const ascending = (await cards(page)).map((card) => card.price);
  expect(ascending.length).toBeGreaterThan(2);
  expect(ascending).toEqual([...ascending].sort((a, b) => a - b));

  await page.goto("/categories/kitchen?sort=price-desc");
  const descending = (await cards(page)).map((card) => card.price);
  expect(descending).toEqual([...ascending].reverse());

  await page.goto("/categories/kitchen");
  const names = (await cards(page)).map((card) => card.name);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

  await page.getByRole("link", { name: "Price: high to low" }).click();
  await expect(page).toHaveURL(/sort=price-desc/);
  await page.getByRole("link", { name: "Price: low to high" }).click();
  await expect(page).toHaveURL(/sort=price-asc/);
  await page.getByRole("link", { name: "Name", exact: true }).click();
  await expect(page).not.toHaveURL(/sort=/);
});
