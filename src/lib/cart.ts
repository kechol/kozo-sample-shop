import { and, asc, eq, sum } from "drizzle-orm";
import type { Database } from "@/db/client";
import { cartItems, carts, products } from "@/db/schema";

export type CartLine = {
  productId: number;
  slug: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  stock: number;
};

export type Cart = {
  lines: CartLine[];
  subtotalCents: number;
};

export type CartChange =
  | { ok: true; quantity: number }
  | { ok: false; reason: "not_found" | "out_of_stock" };

export function subtotalCents(
  lines: Pick<CartLine, "unitPriceCents" | "quantity">[],
) {
  return lines.reduce(
    (total, line) => total + line.unitPriceCents * line.quantity,
    0,
  );
}

export async function createCart(db: Database): Promise<string> {
  const [cart] = await db.insert(carts).values({}).returning({ id: carts.id });
  if (!cart) throw new Error("Failed to create a cart");
  return cart.id;
}

export async function cartExists(
  db: Database,
  cartId: string,
): Promise<boolean> {
  const row = await db.query.carts.findFirst({ where: eq(carts.id, cartId) });
  return row !== undefined;
}

export async function getCart(db: Database, cartId: string): Promise<Cart> {
  const lines = await db
    .select({
      productId: products.id,
      slug: products.slug,
      name: products.name,
      unitPriceCents: products.priceCents,
      quantity: cartItems.quantity,
      stock: products.stock,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(products.name));
  return { lines, subtotalCents: subtotalCents(lines) };
}

export async function countCartItems(
  db: Database,
  cartId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: sum(cartItems.quantity).mapWith(Number) })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));
  return row?.value ?? 0;
}

export async function addToCart(
  db: Database,
  cartId: string,
  productId: number,
  quantity: number,
): Promise<CartChange> {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .select({ stock: products.stock })
      .from(products)
      .where(eq(products.id, productId));
    if (!product) return { ok: false, reason: "not_found" };
    if (product.stock === 0) return { ok: false, reason: "out_of_stock" };

    const [existing] = await tx
      .select({ quantity: cartItems.quantity })
      .from(cartItems)
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)),
      );
    const next = Math.min((existing?.quantity ?? 0) + quantity, product.stock);
    await tx
      .insert(cartItems)
      .values({ cartId, productId, quantity: next })
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.productId],
        set: { quantity: next },
      });
    return { ok: true, quantity: next };
  });
}

export async function setCartQuantity(
  db: Database,
  cartId: string,
  productId: number,
  quantity: number,
): Promise<CartChange> {
  if (quantity <= 0) {
    await removeFromCart(db, cartId, productId);
    return { ok: true, quantity: 0 };
  }
  const [product] = await db
    .select({ stock: products.stock })
    .from(products)
    .where(eq(products.id, productId));
  if (!product) return { ok: false, reason: "not_found" };
  if (product.stock === 0) return { ok: false, reason: "out_of_stock" };
  const next = Math.min(quantity, product.stock);
  const updated = await db
    .update(cartItems)
    .set({ quantity: next })
    .where(
      and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)),
    )
    .returning({ quantity: cartItems.quantity });
  if (updated.length === 0) return { ok: false, reason: "not_found" };
  return { ok: true, quantity: next };
}

export async function removeFromCart(
  db: Database,
  cartId: string,
  productId: number,
) {
  await db
    .delete(cartItems)
    .where(
      and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)),
    );
}
