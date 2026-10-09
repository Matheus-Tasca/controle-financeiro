import { createHmac, timingSafeEqual } from 'node:crypto';

const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

export function createAccessToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: userId, iat: now, exp: now + 30 * 60 });
  const content = `${header}.${payload}`;
  const signature = createHmac('sha256', secret)
    .update(content)
    .digest('base64url');
  return `${content}.${signature}`;
}

export function verifyAccessToken(token) {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32)
    throw new Error('JWT_SECRET is not configured');

  const [header, payload, signature, extra] = String(token || '').split('.');

  if (!header || !payload || !signature || extra) return null;

  try {
    const parsedHeader = JSON.parse(
      Buffer.from(header, 'base64url').toString()
    );

    if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT') return null;
  } catch {
    return null;
  }

  const expected = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest();

  const actual = Buffer.from(signature, 'base64url');

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (
      !claims.sub ||
      !claims.exp ||
      claims.exp <= Math.floor(Date.now() / 1000)
    )
      return null;
    return { userId: claims.sub };
  } catch {
    return null;
  }
}
