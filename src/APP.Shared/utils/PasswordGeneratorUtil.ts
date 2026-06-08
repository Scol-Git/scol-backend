import { randomBytes } from 'crypto';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '@$!%*?&';

function pickChar(chars: string): string {
  return chars[randomBytes(1)[0] % chars.length];
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomBytes(1)[0] % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

/**
 * Generates a temporary password that satisfies lead password policy.
 */
export function generateTemporaryPassword(length = 12): string {
  const all = `${UPPER}${LOWER}${DIGITS}${SPECIAL}`;
  const required = [
    pickChar(UPPER),
    pickChar(LOWER),
    pickChar(DIGITS),
    pickChar(SPECIAL),
  ];
  const remaining = Array.from({ length: Math.max(length - required.length, 0) }, () =>
    pickChar(all),
  );

  return shuffle([...required, ...remaining]).join('');
}
