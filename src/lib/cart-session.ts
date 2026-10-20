import { cookies } from "next/headers";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { cartExists, createCart } from "@/lib/cart";

const CART_COOKIE = "cart_id";
const CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const cartIdSchema = z.uuid();

/** Reads the visitor's cart id without creating one; safe to call while rendering. */
export async function readCartId(): Promise<string | null> {
  const value = (await cookies()).get(CART_COOKIE)?.value;
  return cartIdSchema.safeParse(value).success ? (value as string) : null;
}

/** Returns the visitor's cart id, creating the cart and its cookie when needed. Server Actions only. */
export async function ensureCartId(): Promise<string> {
  const db = getDatabase();
  const existing = await readCartId();
  if (existing && (await cartExists(db, existing))) return existing;
  const cartId = await createCart(db);
  (await cookies()).set(CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_MAX_AGE_SECONDS,
  });
  return cartId;
}
