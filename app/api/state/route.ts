import { allowedOrigin, isAuthenticated } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { limitedText } from '../../../lib/request';
import { stateSchema } from '../../data';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
  if (!await isAuthenticated()) return reply({ error: '请先登录' }, 401);
  const row = db().prepare('SELECT data, revision, updated_at FROM journals WHERE user_id=?').get('owner') as { data: string; revision: number; updated_at: string } | undefined;
  return reply(row ? { state: JSON.parse(row.data), revision: row.revision, updatedAt: row.updated_at } : { state: null, revision: 0 });
}
export async function PUT(request: Request) {
  if (!await isAuthenticated()) return reply({ error: '请先登录' }, 401);
  if (!allowedOrigin(request)) return reply({ error: '来源不允许' }, 403);
  let body;
  try { body = JSON.parse(await limitedText(request)); }
  catch (error) { const large = error instanceof Error && error.message === 'body_too_large'; return reply({ error: large ? '记录超过保存上限，请导出备份' : '无效数据' }, large ? 413 : 400); }
  const parsed = stateSchema.safeParse(body?.state);
  if (!parsed.success || !Number.isSafeInteger(body?.revision) || body.revision < 0) return reply({ error: '记录格式无效，请检查输入范围' }, 400);
  const json = JSON.stringify(parsed.data), now = new Date().toISOString(), store = db();
  store.exec('BEGIN IMMEDIATE');
  try {
    if (body.revision === 0) store.prepare('INSERT OR IGNORE INTO journals(user_id,data,revision,updated_at) VALUES (?,?,0,?)').run('owner', json, now);
    const result = store.prepare('UPDATE journals SET data=?, revision=revision+1, updated_at=? WHERE user_id=? AND revision=?').run(json, now, 'owner', body.revision);
    if (!result.changes) { store.exec('ROLLBACK'); return reply({ error: '另一页面已更新记录，请先导出当前内容，再重新载入。' }, 409); }
    store.exec('COMMIT'); return reply({ revision: body.revision + 1, updatedAt: now });
  } catch (error) { store.exec('ROLLBACK'); throw error; }
}
