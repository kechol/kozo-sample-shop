"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { cancelOrder, markOrderShipped } from "@/lib/admin/orders";
import {
  createProduct,
  type ProductInput,
  type SaveProductResult,
  updateProduct,
} from "@/lib/admin/products";
import { requireAdmin } from "@/lib/auth";
import { parsePrice } from "@/lib/money";
import { orderStatusSchema } from "@/lib/order-status";

export type ProductFormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

// A string check rather than z.coerce, which reads a blank or missing field as 0.
const wholeNumber = z
  .string("Enter a whole number")
  .trim()
  .regex(/^\d{1,6}$/, "Enter a whole number")
  .transform(Number);

const productSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name").max(200),
    slug: z
      .string()
      .trim()
      .max(100)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, digits and single hyphens",
      ),
    description: z.string().trim().min(1, "Enter a description").max(2000),
    price: z.string().transform((text, ctx) => {
      const cents = parsePrice(text);
      if (cents === null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a price such as 12.50",
        });
        return z.NEVER;
      }
      return cents;
    }),
    stock: wholeNumber.pipe(z.number().max(100_000, "Enter at most 100000")),
    categoryId: z.coerce.number<string>().int().positive("Choose a category"),
  })
  .transform(({ price, ...rest }) => ({ ...rest, priceCents: price }));

const productIdSchema = z.coerce.number<string>().int().positive();

function saveFailure(
  result: Exclude<SaveProductResult, { ok: true }>,
): ProductFormState {
  switch (result.reason) {
    case "slug_taken":
      return {
        fieldErrors: { slug: "Another product already uses this slug" },
      };
    case "unknown_category":
      return { fieldErrors: { categoryId: "Choose a category" } };
    case "stock_changed":
      return {
        error: `The stock changed to ${result.currentStock} while you were editing. Reload the page and enter the stock again.`,
      };
    case "not_found":
      return { error: "This product no longer exists." };
  }
}

async function saveProduct(
  formData: FormData,
  save: (input: ProductInput) => Promise<SaveProductResult>,
): Promise<ProductFormState> {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] ??= issue.message;
    }
    return { fieldErrors };
  }
  const result = await save(parsed.data);
  if (!result.ok) return saveFailure(result);
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function createProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();
  return saveProduct(formData, (input) => createProduct(getDatabase(), input));
}

export async function updateProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();
  const id = productIdSchema.safeParse(formData.get("id"));
  const expectedStock = wholeNumber.safeParse(formData.get("expectedStock"));
  if (!id.success || !expectedStock.success) {
    return { error: "Reload the page and try again." };
  }
  return saveProduct(formData, (input) =>
    updateProduct(getDatabase(), id.data, input, expectedStock.data),
  );
}

const orderActionSchema = z.object({
  orderId: z.uuid(),
  // The list filter to return to, so the admin keeps their place.
  status: orderStatusSchema.optional().catch(undefined),
});

async function runOrderAction(
  formData: FormData,
  run: typeof markOrderShipped,
  done: string,
) {
  await requireAdmin();
  const parsed = orderActionSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status") ?? undefined,
  });
  if (!parsed.success) redirect("/admin/orders?notice=not_found");
  const result = await run(getDatabase(), parsed.data.orderId);
  if (result.ok) revalidatePath("/", "layout");
  const search = new URLSearchParams({
    notice: result.ok ? done : result.reason,
  });
  if (parsed.data.status) search.set("status", parsed.data.status);
  redirect(`/admin/orders?${search.toString()}`);
}

export async function markShippedAction(formData: FormData) {
  await runOrderAction(formData, markOrderShipped, "shipped");
}

export async function cancelOrderAction(formData: FormData) {
  await runOrderAction(formData, cancelOrder, "cancelled");
}
