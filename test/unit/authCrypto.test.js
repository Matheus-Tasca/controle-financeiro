import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAccessToken,
  verifyAccessToken,
} from '../../src/shared/infra/auth/jwt.js';
import {
  hashPassword,
  verifyPassword,
} from '../../src/shared/infra/auth/password.js';

test('emite JWT HS256 válido e rejeita assinatura adulterada e algoritmo diferente', () => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-123456';
  try {
    const token = createAccessToken('user-a');
    assert.deepEqual(verifyAccessToken(token), { userId: 'user-a' });
    assert.equal(verifyAccessToken(`${token.slice(0, -1)}x`), null);

    const [, payload, signature] = token.split('.');
    const noneHeader = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' })
    ).toString('base64url');
    assert.equal(
      verifyAccessToken(`${noneHeader}.${payload}.${signature}`),
      null
    );
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});

test('hash de senha usa salt e valida apenas a senha correta', async () => {
  const firstHash = await hashPassword('senha-segura-123');
  const secondHash = await hashPassword('senha-segura-123');

  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword('senha-segura-123', firstHash), true);
  assert.equal(await verifyPassword('senha-incorreta', firstHash), false);
  assert.equal(await verifyPassword('senha-segura-123', 'inválido'), false);
});
