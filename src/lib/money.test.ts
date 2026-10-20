import { describe, expect, it } from "vitest";
import { formatPrice } from "./money";

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
