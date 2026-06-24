export const TURKISH_MOBILE_PHONE_PATTERN = '05[0-9]{2} [0-9]{3} [0-9]{2} [0-9]{2}';

/** Converts numeric input to the canonical Turkish mobile form: 05XX XXX XX XX. */
export function formatTurkishMobilePhone(input: string, previous = ''): string {
  let digits = input.replace(/\D/g, '').slice(0, 11);

  // Reject any prefix other than 05. Keeping the previous value makes invalid
  // key presses a no-op instead of unexpectedly clearing a completed number.
  if (digits.length >= 1 && digits[0] !== '0') return previous;
  if (digits.length >= 2 && digits[1] !== '5') return previous;

  const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)]
    .filter(Boolean);
  return parts.join(' ');
}

export function isCompleteTurkishMobilePhone(value: string): boolean {
  return /^05\d{2} \d{3} \d{2} \d{2}$/.test(value);
}
