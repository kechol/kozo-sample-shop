import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps same-origin paths and their query", () => {
    expect(safeNextPath("/account/orders", "/")).toBe("/account/orders");
    expect(safeNextPath("/search?q=kettle", "/")).toBe("/search?q=kettle");
  });

  it("rejects other origins", () => {
    for (const value of [
      "https://evil.example.com",
      "//evil.example.com",
      "/\\evil.example.com",
      "javascript:alert(1)",
      "/.//evil.example.com",
      "/%2e//evil.example.com",
      "/a/..//evil.example.com",
      "/\tevil",
      "/\n/evil.example.com",
      "",
    ]) {
      expect(safeNextPath(value, "/fallback")).toBe("/fallback");
    }
  });

  it("falls back for missing values", () => {
    expect(safeNextPath(null, "/fallback")).toBe("/fallback");
  });
});
