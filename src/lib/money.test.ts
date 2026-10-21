import { describe, expect, it } from "vitest";
import { formatPrice, formatPriceInput, parsePrice } from "./money";

describe("formatPrice", () => {
  it("formats cents as US dollars", () => {
    expect(formatPrice(4200)).toBe("$42.00");
    expect(formatPrice(705)).toBe("$7.05");
  });

  it("groups thousands", () => {
    expect(formatPrice(123456789)).toBe("$1,234,567.89");
  });

  it("rejects fractional cents", () => {
    expect(() => formatPrice(10.5)).toThrow(RangeError);
  });
});

describe("parsePrice", () => {
  it("reads dollars and cents into integer cents", () => {
    expect(parsePrice("12")).toBe(1200);
    expect(parsePrice("12.5")).toBe(1250);
    expect(parsePrice(" 0.07 ")).toBe(7);
    expect(parsePrice("0.29")).toBe(29);
  });

  it("rejects zero, negatives, fractional cents and other text", () => {
    for (const text of ["0", "0.00", "-1", "1.005", "1e3", "12,50", "", "."]) {
      expect(parsePrice(text)).toBeNull();
    }
  });
});

describe("formatPriceInput", () => {
  it("writes cents back in the form parsePrice reads", () => {
    expect(formatPriceInput(1250)).toBe("12.50");
    expect(formatPriceInput(7)).toBe("0.07");
    expect(parsePrice(formatPriceInput(8900))).toBe(8900);
  });
});
