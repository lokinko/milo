import { NextResponse } from 'next/server';
import { allowedOrigin, authConfig, revokeSession, sessionCookie, sessionOptions } from '../../../../lib/auth';
import { sitePath } from '../../../../lib/paths';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!allowedOrigin(request)) return NextResponse.json({ error: '来源不允许' }, { status: 403 });
  await revokeSession();
  const response = NextResponse.redirect(new URL(sitePath('/login'), authConfig().origin), 303);
  response.cookies.set(sessionCookie, '', { ...sessionOptions(), maxAge: 0 });
  response.headers.set('Cache-Control', 'no-store'); return response;
}
