import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * Password hashing using Node's built-in scrypt — no external dependency.
 * Format stored in the DB: `salt:derivedKey` (both hex).
 */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, 'hex');
  const derived = scryptSync(password, salt, 64);
  if (keyBuffer.length !== derived.length) return false;
  return timingSafeEqual(keyBuffer, derived);
}
