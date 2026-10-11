import test from 'node:test';
import { execFileSync } from 'node:child_process';
test('Nginx installation targets one TLS block, preserves other sites and is idempotent', () => {
  execFileSync('python3', ['tests/test_nginx.py'], { stdio: 'inherit' });
});
