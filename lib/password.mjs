import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new Error('密码须为 12–256 个字符');
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${key}`;
}
export function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 256 || typeof encoded !== 'string') return false;
  const match = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(encoded);
  if (!match) return false;
  return timingSafeEqual(scryptSync(password, match[1], 64), Buffer.from(match[2], 'hex'));
}
