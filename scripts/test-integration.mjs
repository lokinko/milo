import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { hashPassword } from '../lib/password.mjs';
import { assembleRelease } from './assemble-release.mjs';
const testDir = await mkdtemp(path.join(tmpdir(), 'milo-test-'));
const origin = 'http://127.0.0.1:3197', basePath = '/milo';
const password = 'integration-test-only-password';
const release = path.join(testDir, 'release');
await assembleRelease(process.cwd(), release);
await mkdir('work/integration', { recursive: true });
for (const name of ['exercises', 'data']) {
  const source = await readFile(`app/${name}.ts`, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText.replace("'./exercises'", "'./exercises.mjs'");
  await writeFile(`work/integration/${name}.mjs`, output);
}
const { initialState } = await import(path.resolve('work/integration/data.mjs'));
let child;
const environment = { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', HOSTNAME: '127.0.0.1', PORT: '3197', APP_ORIGIN: origin, NEXT_PUBLIC_BASE_PATH: basePath, AUTH_PASSWORD_HASH: hashPassword(password), DATABASE_PATH: path.join(testDir, 'milo.sqlite'), MILO_RELEASE_ID: 'source-release-test' };
async function start() {
  child = spawn(process.execPath, [path.join(release, 'server.js')], { cwd: release, env: environment, stdio: 'pipe' });
  let logs = ''; child.stderr.on('data', b => { logs += b.toString(); });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Server stopped: ${logs}`);
    try { if ((await fetch(origin + basePath + '/api/health')).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Server readiness timed out: ${logs}`);
}
async function stop() { if (child && child.exitCode === null) { const done = new Promise(resolve => child.once('exit', resolve)); child.kill('SIGTERM'); await done; } }
const request = (url, options = {}) => fetch(origin + basePath + url, { redirect: 'manual', ...options });
try {
  await start();
  assert.deepEqual(await (await request('/api/health')).json(), { status: 'ok', release: 'source-release-test' });
  assert.equal((await request('/api/state')).status, 401);
  const landing = await request(''); assert.equal(landing.status, 307); assert.equal(new URL(landing.headers.get('location'), origin).pathname, '/milo/login');
  assert.equal((await fetch(new URL(landing.headers.get('location'), origin))).status, 200);
  const loginPage = await request('/login'); assert.equal(loginPage.status, 200); const html = await loginPage.text(); assert(html.includes('/milo/api/auth/login'));
  const assets = [...html.matchAll(/(?:src|href)="(\/milo\/_next\/[^\"]+)"/g)].map(x => x[1]);
  assert(assets.length > 0); for (const asset of assets.slice(0, 4)) assert.equal((await fetch(origin + asset)).status, 200);
  const form = (value, headers = {}) => request('/api/auth/login', { method: 'POST', headers: { origin, 'content-type': 'application/x-www-form-urlencoded', ...headers }, body: new URLSearchParams({ password: value }) });
  assert.equal((await form(password, { origin: 'https://untrusted.example' })).status, 403);
  const wrong = await form('wrong-password'); assert(wrong.headers.get('location').includes('error=password'));
  const login = await form(password); assert.equal(login.status, 303);
  assert.equal(new URL(login.headers.get('location'), origin).pathname, '/milo');
  const setCookie = login.headers.get('set-cookie'); assert(setCookie.includes('HttpOnly')); assert(setCookie.includes('Path=/milo'));
  const cookie = setCookie.split(';')[0];
  const alreadySignedIn = await request('/login', { headers: { cookie } });
  assert.equal(new URL(alreadySignedIn.headers.get('location'), origin).pathname.replace(/\/$/, ''), '/milo');
  const headers = { origin, cookie, 'content-type': 'application/json' };
  assert.equal((await request('')).status, 307);
  assert.equal((await request('', { headers: { cookie } })).status, 200);
  assert.deepEqual(await (await request('/api/state', { headers })).json(), { state: null, revision: 0 });
  const state = structuredClone(initialState); state.profile.age = '35'; state.days['2026-10-11'] = { checks: ['lunch'], pain: '0', skin: '', sleep: '8', weight: '', walk: '5', note: 'integration test only', redFlag: false, flare: false, rehabLocation: 'home' };
  const put = (body, extra = {}) => request('/api/state', { method: 'PUT', headers: { ...headers, ...extra }, body: JSON.stringify(body) });
  assert.equal((await put({ state, revision: 0 }, { origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await put({ state: {}, revision: 0 })).status, 400);
  assert.equal((await put({ state, revision: 0 })).status, 200);
  assert.equal((await put({ state, revision: 0 })).status, 409);
  assert.equal((await request('/api/state', { method: 'PUT', headers, body: 'x'.repeat(900001) })).status, 413);
  const saved = await (await request('/api/state', { headers })).json(); assert.equal(saved.revision, 1); assert.deepEqual(saved.state, state);
  await stop(); await start();
  const restored = await (await request('/api/state', { headers })).json(); assert.deepEqual(restored.state, state); assert.equal(restored.revision, 1);
  assert.equal((await request('/api/auth/logout', { method: 'POST', headers })).status, 303);
  assert.equal((await request('/api/state', { headers })).status, 401);
  for (let i = 0; i < 8; i++) await form('incorrect-long-password', { 'x-real-ip': 'test-rate-limit' });
  const blocked = await form(password, { 'x-real-ip': 'test-rate-limit' }); assert(blocked.headers.get('location').includes('error=rate'));
  console.log('Production integration passed: subpath/assets, password login, CSRF, validation, payload limits, optimistic conflicts, persistence across restart, logout/revocation and login throttling.');
} finally { await stop(); await rm(testDir, { recursive: true, force: true }); }
