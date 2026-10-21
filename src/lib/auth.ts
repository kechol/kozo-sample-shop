import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDatabase } from "@/db/client";
import { accounts, sessions, users, verifications } from "@/db/schema";

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    user: {
      additionalFields: {
        // input: false keeps the role out of sign-up and profile updates, so nobody can grant it to themselves.
        role: {
          type: ["customer", "admin"],
          required: false,
          defaultValue: "customer",
          input: false,
        },
      },
    },
    // Must stay last so Server Actions can set the session cookie.
    plugins: [nextCookies()],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

// Built on first use, so importing this module needs neither a database nor a secret.
export function getAuth() {
  auth ??= createAuth();
  return auth;
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, role } = session.user;
  return { id, name, email, role: role === "admin" ? "admin" : "customer" };
}

// A 404 rather than a sign-in prompt, so the admin pages do not reveal that they exist.
// Server Actions call this too, since they can be invoked without rendering the page.
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (user?.role !== "admin") notFound();
  return user;
}
