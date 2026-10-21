import { describe, expect, it } from "vitest";
import { canViewOrder } from "./checkout";

const cartId = "00000000-0000-4000-8000-000000000001";

describe("canViewOrder", () => {
  it("lets the signed-in owner view the order from any browser", () => {
    expect(
      canViewOrder(
        { cartId, userId: "user-1" },
        { cartId: null, userId: "user-1" },
      ),
    ).toBe(true);
  });

  it("lets the browser whose cart placed the order view it", () => {
    expect(
      canViewOrder({ cartId, userId: null }, { cartId, userId: null }),
    ).toBe(true);
  });

  it("hides the order from other users and other carts", () => {
    expect(
      canViewOrder(
        { cartId, userId: "user-1" },
        { cartId: null, userId: "user-2" },
      ),
    ).toBe(false);
    expect(
      canViewOrder(
        { cartId, userId: null },
        { cartId: "00000000-0000-4000-8000-000000000002", userId: null },
      ),
    ).toBe(false);
  });

  it("ignores the cart cookie for an account's order", () => {
    expect(
      canViewOrder({ cartId, userId: "user-1" }, { cartId, userId: null }),
    ).toBe(false);
    expect(
      canViewOrder({ cartId, userId: "user-1" }, { cartId, userId: "user-2" }),
    ).toBe(false);
  });

  it("never matches on missing ids", () => {
    expect(
      canViewOrder(
        { cartId: null, userId: null },
        { cartId: null, userId: null },
      ),
    ).toBe(false);
  });
});
