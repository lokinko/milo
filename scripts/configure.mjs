import { readFile, mkdir, writeFile, chmod, rename } from 'node:fs/promises';
import { hashPassword } from '../lib/password.mjs';
const [originArg = '', pathArg = '', portArg = '', reset = '0'] = process.argv.slice(2);
await mkdir('.deploy', { recursive: true, mode: 0o700 });
let old = {};
try { old = JSON.parse(await readFile('.deploy/config.json', 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw new Error('Existing deployment config is invalid; restore it before deploying'); }
const origin = originArg || old.origin || 'https://www.madeagents.ai';
const basePath = pathArg || old.basePath || '/milo';
const port = portArg || old.port || '3088';
const url = new URL(origin);
if (!['https:', 'http:'].includes(url.protocol) || url.origin !== origin || url.username || url.password || !/^[a-zA-Z0-9.:[\]-]+$/.test(url.host)) throw new Error('Origin must be a plain HTTP(S) origin');
if (!/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(basePath)) throw new Error('Invalid base path');
if (!/^\d{2,5}$/.test(String(port)) || Number(port) < 1024 || Number(port) > 65535) throw new Error('Port must be 1024–65535');
let passwordHash = old.passwordHash;
if (!passwordHash || reset === '1') {
  const chunks = []; for await (const chunk of process.stdin) chunks.push(chunk);
  const password = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
  passwordHash = hashPassword(password);
}
if (!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash)) throw new Error('Invalid password hash');
const config = { origin, basePath, port: String(port), passwordHash };
async function atomic(path, content) { await writeFile(`${path}.tmp`, content, { mode: 0o600 }); await chmod(`${path}.tmp`, 0o600); await rename(`${path}.tmp`, path); }
await atomic('.deploy/config.json', JSON.stringify(config, null, 2) + '\n');
await atomic('.deploy/milo.env', `APP_ORIGIN=${origin}\nNEXT_PUBLIC_BASE_PATH=${basePath}\nMILO_PORT=${port}\nAUTH_PASSWORD_HASH=${passwordHash}\n`);
console.log(`Configured ${origin}${basePath} (localhost:${port}); credentials retained privately.`);
