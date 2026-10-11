import { db } from '../../../lib/db';
import { authConfig } from '../../../lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { authConfig(); db().prepare('SELECT 1').get(); return Response.json({ status: 'ok', ...(process.env.MILO_RELEASE_ID ? { release: process.env.MILO_RELEASE_ID } : {}) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ status: 'unavailable' }, { status: 503 }); }
}
