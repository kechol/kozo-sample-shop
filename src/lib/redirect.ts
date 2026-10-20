// Only same-origin paths, so a crafted link cannot send the buyer to another site after sign-in.
export function safeNextPath(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  const base = "http://same-origin.invalid";
  const url = new URL(value, base);
  return url.origin === base ? `${url.pathname}${url.search}` : fallback;
}
