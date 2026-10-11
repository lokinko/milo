import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../lib/password.mjs';
test('salted password hashes validate only the correct password', () => {
  const password = 'test-only-long-password';
  const first = hashPassword(password), second = hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(verifyPassword(password, first), true);
  assert.equal(verifyPassword('incorrect-password', first), false);
  assert.equal(verifyPassword(password, 'invalid-hash'), false);
  assert.throws(() => hashPassword('short'));
  assert.equal(verifyPassword('a'.repeat(257), first), false);
});
