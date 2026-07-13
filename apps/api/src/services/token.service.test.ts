import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_APP_TOKEN_LENGTH, signAppToken, verifySignedToken } from './token.service.js';

const decodePayload = (token: string) => JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as Record<string, unknown>;

test('signAppToken only includes minimal safe claims', () => {
  const token = signAppToken({
    aud: 'sk-quiz',
    sub: 'user_123',
    email: 'learner@example.com',
    name: 'Learner Example',
    role: 'student',
    permissions: ['apps:read'],
    sid: 'session_123',
    avatarUrl: `data:image/jpeg;base64,${'a'.repeat(20_000)}`,
    analytics: { visits: Array.from({ length: 100 }, (_, index) => index) },
    preferences: { theme: 'light' }
  } as never);

  const payload = decodePayload(token);

  assert.equal(payload.iss, 'sk-central');
  assert.equal(payload.aud, 'sk-quiz');
  assert.equal(payload.sub, 'user_123');
  assert.equal(payload.email, 'learner@example.com');
  assert.equal(payload.name, 'Learner Example');
  assert.equal(payload.role, 'student');
  assert.deepEqual(payload.permissions, ['apps:read']);
  assert.equal(payload.sid, 'session_123');
  assert.equal('avatarUrl' in payload, false);
  assert.equal('analytics' in payload, false);
  assert.equal('preferences' in payload, false);
  assert.equal(JSON.stringify(payload).includes('data:image'), false);
  assert.ok(token.length < MAX_APP_TOKEN_LENGTH, `token length ${token.length} should stay below ${MAX_APP_TOKEN_LENGTH}`);
  assert.equal(verifySignedToken(token)?.sub, 'user_123');
});

