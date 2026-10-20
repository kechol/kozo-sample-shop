import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
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

export type SessionUser = { id: string; name: string; email: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email };
}
