import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signInAction } from "@/app/account/actions";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/auth";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  if (await getSessionUser()) redirect("/account/orders");
  const next = firstParam((await searchParams).next);
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>
      <AuthForm
        action={signInAction}
        next={next}
        submitLabel="Sign in"
        fields={[
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
            autoComplete: "current-password",
          },
        ]}
      />
      <p className="mt-6 text-sm text-stone-600">
        New here?{" "}
        <Link href="/sign-up" className="text-brand">
          Create an account
        </Link>
      </p>
    </>
  );
}
