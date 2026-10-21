import { describe, expect, it } from "vitest";
import { subtotalCents } from "./cart";

describe("subtotalCents", () => {
  it("is zero for an empty cart", () => {
    expect(subtotalCents([])).toBe(0);
  });

  it("multiplies each unit price by its quantity", () => {
    expect(
      subtotalCents([
        { unitPriceCents: 4200, quantity: 2 },
        { unitPriceCents: 700, quantity: 3 },
      ]),
    ).toBe(10500);
  });
});
