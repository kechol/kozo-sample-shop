import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signUpAction } from "@/app/account/actions";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage() {
  if (await getSessionUser()) redirect("/account/orders");
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Create an account</h1>
      <AuthForm
        action={signUpAction}
        submitLabel="Create account"
        fields={[
          { name: "name", label: "Name", type: "text", autoComplete: "name" },
          {
            name: "email",
            label: "Email",
            type: "email",
            autoComplete: "email",
          },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "new-password",
          },
        ]}
      />
      <p className="mt-6 text-sm text-stone-600">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-brand">
          Sign in
        </Link>
      </p>
    </>
  );
}
