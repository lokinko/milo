import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyPassword } from '../lib/password.mjs';

test('source deployment retains credentials on updates, rotates on reset and keeps private files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'milo-config-'));
  const password = 'source-deployment-test-password';
  const run = (reset, input, origin='https://www.madeagents.ai') => spawnSync(process.execPath, ['scripts/configure.mjs', origin, '/milo', '3088', reset, dir, '/opt/milo/shared/data/milo.sqlite'], { input, encoding: 'utf8' });
  try {
    const first = run('0', password); assert.equal(first.status, 0, first.stderr);
    const initial = JSON.parse(await readFile(join(dir, 'config.json'), 'utf8'));
    assert(verifyPassword(password, initial.passwordHash));
    assert(!first.stdout.includes(initial.passwordHash)); assert(!first.stdout.includes(password));
    assert.equal((await stat(join(dir, 'milo.env'))).mode & 0o777, 0o600);
    assert.equal((await stat(dir)).mode & 0o777, 0o700);
    const environment = await readFile(join(dir, 'milo.env'), 'utf8');
    assert(environment.includes('PORT=3088\nHOSTNAME=127.0.0.1\n'));
    assert(environment.includes('DATABASE_PATH=/opt/milo/shared/data/milo.sqlite\n'));
    assert(!environment.includes(password));
    assert.equal(run('0', '').status, 0);
    assert.equal(JSON.parse(await readFile(join(dir, 'config.json'), 'utf8')).passwordHash, initial.passwordHash);
    assert.equal(run('1', 'new-source-deployment-password').status, 0);
    const reset = JSON.parse(await readFile(join(dir, 'config.json'), 'utf8'));
    assert(!verifyPassword(password, reset.passwordHash)); assert(verifyPassword('new-source-deployment-password', reset.passwordHash));
    assert.notEqual(run('0', '', 'https://bad.example/path').status, 0);
    assert.deepEqual(JSON.parse(await readFile(join(dir, 'config.json'), 'utf8')), reset);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('systemd service runs as a separate user with persistent data and a private loopback environment', () => {
  const result = spawnSync('python3', ['scripts/systemd-unit.py', '/opt/milo', '/opt/milo/runtime/node/bin/node', 'release-test'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert(result.stdout.includes('User=milo\nGroup=milo\n'));
  assert(result.stdout.includes('WorkingDirectory=/opt/milo/current\n'));
  assert(result.stdout.includes('EnvironmentFile=/opt/milo/shared/.deploy/milo.env\n'));
  assert(result.stdout.includes('Environment=MILO_RELEASE_ID=release-test\n'));
  assert(result.stdout.includes('ExecStart=/opt/milo/runtime/node/bin/node /opt/milo/current/server.js\n'));
  assert(result.stdout.includes('ReadWritePaths=/opt/milo/shared/data\n'));
  const invalid = spawnSync('python3', ['scripts/systemd-unit.py', '/opt/milo\nUser=root', '/usr/bin/node'], { encoding: 'utf8' });
  assert.notEqual(invalid.status, 0);
});
