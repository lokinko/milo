import { isAuthenticated } from '../../lib/auth';
import { sitePath } from '../../lib/paths';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAuthenticated()) redirect('/');
  const { error } = await searchParams;
  return <main className="login-shell"><section className="card login-card">
    <span className="kicker">MILO · DAILY WELLNESS</span><h1>欢迎回到循日</h1>
    <p>输入你设置的独立密码，继续照顾今天的自己。</p>
    {error && <p className="alert danger" role="alert">{error === 'rate' ? '尝试次数过多，请 15 分钟后再试。' : '密码不正确，请重试。'}</p>}
    <form action={sitePath('/api/auth/login')} method="post">
      <label>登录密码<input name="password" type="password" required minLength={12} maxLength={256} autoComplete="current-password" autoFocus/></label>
      <button className="btn primary" type="submit">登录 Milo</button>
    </form><p className="hint">健康记录保存在你的服务器；无需 ChatGPT 账号。</p>
  </section></main>;
}
