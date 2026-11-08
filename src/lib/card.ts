export function normalizeCardNumber(input: string): string {
  return input.replace(/[\s-]/g, "");
}

// Luhn check: catches single-digit typos and most transpositions before calling the provider.
export function isValidCardNumber(cardNumber: string): boolean {
  if (!/^\d{12,19}$/.test(cardNumber)) return false;
  let sum = 0;
  for (let i = 0; i < cardNumber.length; i++) {
    let digit = Number(cardNumber[cardNumber.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}
