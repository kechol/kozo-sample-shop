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
