"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { safeNextPath } from "@/lib/redirect";

export type AuthFormState = { error?: string };

const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(1, "Enter your name").max(100),
  password: z.string().min(8, "Use at least 8 characters"),
});

export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    await getAuth().api.signInEmail({
      body: parsed.data,
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError)
      return { error: "Incorrect email or password." };
    throw error;
  }
  redirect(safeNextPath(formData.get("next"), "/account/orders"));
}

export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    await getAuth().api.signUpEmail({
      body: parsed.data,
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { error: "That email cannot be used. Try signing in instead." };
    }
    throw error;
  }
  redirect(safeNextPath(formData.get("next"), "/account/orders"));
}

export async function signOutAction() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/");
}
