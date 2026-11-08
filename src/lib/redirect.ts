// Only same-origin paths, so a crafted link cannot send the buyer to another site after sign-in.
export function safeNextPath(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  // Browsers treat backslashes as slashes and drop control characters, so either could turn
  // the path into another origin after this check.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are what it rejects
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  const base = "http://same-origin.invalid";
  const url = new URL(value, base);
  if (url.origin !== base) return fallback;
  // Dot segments normalize to a leading "//", which a browser reads as another origin.
  if (url.pathname.startsWith("//")) return fallback;
  return `${url.pathname}${url.search}`;
}
