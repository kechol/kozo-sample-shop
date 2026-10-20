"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { getSessionUser } from "@/lib/auth";
import { isValidCardNumber, normalizeCardNumber } from "@/lib/card";
import { readCartId } from "@/lib/cart-session";
import { placeOrder } from "@/lib/checkout";
import { COUNTRIES } from "@/lib/countries";
import { getPaymentsClient } from "@/lib/payments/client";

export type CheckoutState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const checkoutSchema = z.object({
  email: z.email("Enter a valid email address"),
  name: z.string().trim().min(1, "Enter the recipient's name").max(100),
  address: z.string().trim().min(1, "Enter a street address").max(200),
  city: z.string().trim().min(1, "Enter a city").max(100),
  postalCode: z.string().trim().min(1, "Enter a postal code").max(20),
  country: z.enum(
    COUNTRIES.map((country) => country.code) as [string, ...string[]],
    "Choose a country",
  ),
  cardNumber: z
    .string()
    .transform(normalizeCardNumber)
    .refine(isValidCardNumber, "Enter a valid card number"),
});

const paymentMessages: Record<string, string> = {
  card_declined: "Your card was declined. Try another card.",
  invalid_number: "That card number cannot be charged. Try another card.",
};

export async function checkoutAction(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const cartId = await readCartId();
  if (!cartId) redirect("/cart");

  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      fieldErrors[field] ??= issue.message;
    }
    return { fieldErrors };
  }
  const { cardNumber, ...shipping } = parsed.data;

  const user = await getSessionUser();
  const result = await placeOrder(getDatabase(), getPaymentsClient(), {
    cartId,
    userId: user?.id ?? null,
    shipping,
    cardNumber,
  });
  revalidatePath("/", "layout");
  if (result.ok) redirect(`/orders/${result.orderId}`);
  switch (result.reason) {
    case "payment_pending":
      redirect(`/orders/${result.orderId}`);
      break;
    case "empty_cart":
      redirect("/cart");
      break;
    case "insufficient_stock":
      return {
        error: `Not enough stock for ${result.productNames.join(", ")}. Update your cart and try again.`,
      };
    case "payment_failed":
      return {
        error:
          paymentMessages[result.code] ??
          "The payment could not be processed. Please try again later.",
      };
  }
}
