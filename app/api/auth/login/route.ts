import { NextResponse } from 'next/server';
import { allowedOrigin, authConfig, clearFailures, issueSession, loginBlocked, recordFailure, sessionCookie, sessionOptions, validPassword } from '../../../../lib/auth';
import { sitePath } from '../../../../lib/paths';
import { limitedText } from '../../../../lib/request';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: '来源不允许' }, { status: 403 });
  const ip = request.headers.get('x-real-ip') || 'local';
  const config = authConfig();
  const go = (path: string) => NextResponse.redirect(new URL(sitePath(path), config.origin), 303);
  if (loginBlocked(ip)) return go('/login?error=rate');
  let password: string;
  try { password = new URLSearchParams(await limitedText(request, 4096)).get('password') || ''; }
  catch { return NextResponse.json({ error: '请求过大' }, { status: 413 }); }
  if (!validPassword(password)) { recordFailure(ip); return go('/login?error=password'); }
  clearFailures(ip);
  const response = go(''); response.cookies.set(sessionCookie, issueSession(), sessionOptions());
  response.headers.set('Cache-Control', 'no-store'); return response;
}
