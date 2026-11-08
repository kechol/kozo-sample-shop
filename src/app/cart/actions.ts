"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { addToCart, removeFromCart, setCartQuantity } from "@/lib/cart";
import { ensureCartId, readCartId } from "@/lib/cart-session";

const lineSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(0).max(99),
});

export async function addToCartAction(formData: FormData) {
  const parsed = lineSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success || parsed.data.quantity === 0)
    redirect("/cart?error=invalid");
  const cartId = await ensureCartId();
  const result = await addToCart(
    getDatabase(),
    cartId,
    parsed.data.productId,
    parsed.data.quantity,
  );
  revalidatePath("/", "layout");
  redirect(result.ok ? "/cart" : `/cart?error=${result.reason}`);
}

export async function updateCartLineAction(formData: FormData) {
  const parsed = lineSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
  });
  const cartId = await readCartId();
  if (!parsed.success || !cartId) redirect("/cart?error=invalid");
  const result = await setCartQuantity(
    getDatabase(),
    cartId,
    parsed.data.productId,
    parsed.data.quantity,
  );
  revalidatePath("/", "layout");
  if (!result.ok) redirect(`/cart?error=${result.reason}`);
}

export async function removeCartLineAction(formData: FormData) {
  const productId = z.coerce
    .number()
    .int()
    .positive()
    .safeParse(formData.get("productId"));
  const cartId = await readCartId();
  if (!productId.success || !cartId) redirect("/cart?error=invalid");
  await removeFromCart(getDatabase(), cartId, productId.data);
  revalidatePath("/", "layout");
}
