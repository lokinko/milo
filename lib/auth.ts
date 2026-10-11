import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash, randomBytes } from 'node:crypto';
import { db } from './db';
import { basePath } from './paths';
import { verifyPassword } from './password.mjs';
export const sessionCookie = 'milo_session';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function authConfig() {
  const origin = process.env.APP_ORIGIN || 'http://localhost:3000';
  const parsed = new URL(origin);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) throw new Error('APP_ORIGIN must be an HTTP(S) origin without a path');
  const passwordHash = process.env.AUTH_PASSWORD_HASH;
  if (!passwordHash || !/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash)) throw new Error('Configure AUTH_PASSWORD_HASH before starting Milo');
  return { origin, passwordHash, secure: parsed.protocol === 'https:' };
}
export function allowedOrigin(request: Request) { return request.headers.get('origin') === authConfig().origin; }
export function validPassword(password: string) { return verifyPassword(password, authConfig().passwordHash); }
export function issueSession() {
  const token = randomBytes(32).toString('hex');
  const expires = Date.now() + 30 * 24 * 3600 * 1000;
  db().prepare('DELETE FROM sessions WHERE expires_at <= ? OR credential_hash != ?').run(Date.now(), digest(authConfig().passwordHash));
  db().prepare('INSERT INTO sessions(token_hash, expires_at, credential_hash) VALUES (?, ?, ?)').run(digest(token), expires, digest(authConfig().passwordHash));
  return token;
}
export function sessionOptions() { return { httpOnly: true, secure: authConfig().secure, sameSite: 'lax' as const, path: basePath, maxAge: 30 * 24 * 3600 }; }
export async function isAuthenticated() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  return Boolean(db().prepare('SELECT 1 FROM sessions WHERE token_hash=? AND expires_at>? AND credential_hash=?').get(digest(token), Date.now(), digest(authConfig().passwordHash)));
}
export async function revokeSession() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (token) db().prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));
}
export async function requireUser() { if (!await isAuthenticated()) redirect('/login'); }
export function loginBlocked(ip: string) {
  const now = Date.now();
  db().prepare('DELETE FROM login_attempts WHERE started_at < ?').run(now - 15 * 60 * 1000);
  return [digest(ip), 'global'].some((key) => {
    const row = db().prepare('SELECT failures FROM login_attempts WHERE key=?').get(key) as { failures: number } | undefined;
    return row && row.failures >= (key === 'global' ? 100 : 8);
  });
}
export function recordFailure(ip: string) {
  for (const key of [digest(ip), 'global']) db().prepare('INSERT INTO login_attempts(key,failures,started_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET failures=failures+1').run(key, Date.now());
}
export function clearFailures(ip: string) { db().prepare('DELETE FROM login_attempts WHERE key=?').run(digest(ip)); }
