import { describe, expect, it } from "vitest";
import { isValidCardNumber, normalizeCardNumber } from "./card";

describe("normalizeCardNumber", () => {
  it("strips spaces and dashes", () => {
    expect(normalizeCardNumber("4242 4242-4242 4242")).toBe("4242424242424242");
  });
});

describe("isValidCardNumber", () => {
  it("accepts numbers that pass the Luhn check", () => {
    expect(isValidCardNumber("4242424242424242")).toBe(true);
    expect(isValidCardNumber("4000000000000002")).toBe(true);
    expect(isValidCardNumber("4000000000000077")).toBe(true);
  });

  it("rejects a single mistyped digit", () => {
    expect(isValidCardNumber("4242424242424241")).toBe(false);
  });

  it("rejects non-digits and wrong lengths", () => {
    expect(isValidCardNumber("4242-4242-4242-4242")).toBe(false);
    expect(isValidCardNumber("42424242424")).toBe(false);
    expect(isValidCardNumber("42424242424242424242")).toBe(false);
  });
});
