const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatPrice(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new RangeError(`Price must be an integer number of cents: ${cents}`);
  }
  return formatter.format(cents / 100);
}

// Parses a typed dollar amount such as "12" or "12.5" with string arithmetic, never floats.
export function parsePrice(text: string): number | null {
  const match = /^(\d{1,6})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const cents =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return cents > 0 ? cents : null;
}

export function formatPriceInput(cents: number): string {
  return `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
