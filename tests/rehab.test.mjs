import test from 'node:test';
import { execFileSync } from 'node:child_process';
test('legacy records and existing exercise permission guards remain compatible', () => {
  execFileSync(process.execPath, ['scripts/check-rehab.mjs'], { stdio: 'inherit' });
});
