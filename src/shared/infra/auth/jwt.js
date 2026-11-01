import { createHmac, timingSafeEqual } from 'node:crypto';

const JWT_ALGORITHM = 'HS256';
const JWT_TYPE = 'JWT';
const ACCESS_TOKEN_EXPIRATION_SECONDS = 30 * 60; // 30 minutos
const MIN_JWT_SECRET_LENGTH = 32;

const encodeBase64Url = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

export function createAccessToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }

  const currentTimestampSeconds = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url({ alg: JWT_ALGORITHM, typ: JWT_TYPE });
  const payload = encodeBase64Url({
    sub: userId,
    iat: currentTimestampSeconds,
    exp: currentTimestampSeconds + ACCESS_TOKEN_EXPIRATION_SECONDS,
  });

  const unsignedToken = `${header}.${payload}`;
  const signature = createHmac('sha256', secret)
    .update(unsignedToken)
    .digest('base64url');

  return `${unsignedToken}.${signature}`;
}

export function verifyAccessToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error('JWT_SECRET is not configured');
  }

  const [header, payload, signature, extraSegment] = String(token || '').split('.');
  if (!header || !payload || !signature || extraSegment) {
    return null;
  }

  try {
    const parsedHeader = JSON.parse(
      Buffer.from(header, 'base64url').toString()
    );
    if (parsedHeader.alg !== JWT_ALGORITHM || parsedHeader.typ !== JWT_TYPE) {
      return null;
    }
  } catch {
    return null;
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest();

  const actualSignature = Buffer.from(signature, 'base64url');

  const isSignatureValid =
    actualSignature.length === expectedSignature.length &&
    timingSafeEqual(actualSignature, expectedSignature);

  if (!isSignatureValid) {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const currentTimestampSeconds = Math.floor(Date.now() / 1000);

    if (
      !claims.sub ||
      !claims.exp ||
      claims.exp <= currentTimestampSeconds
    ) {
      return null;
    }

    return { userId: claims.sub };
  } catch {
    return null;
  }
}
