import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SALT_BYTE_LENGTH = 16;
const DERIVED_KEY_BYTE_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(SALT_BYTE_LENGTH).toString('hex');
  const derivedKey = await scrypt(password, salt, DERIVED_KEY_BYTE_LENGTH);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash) {
    return false;
  }

  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) {
    return false;
  }

  const expectedHashBuffer = Buffer.from(expectedHex, 'hex');
  const actualHashBuffer = await scrypt(password, salt, expectedHashBuffer.length);

  return (
    actualHashBuffer.length === expectedHashBuffer.length &&
    timingSafeEqual(actualHashBuffer, expectedHashBuffer)
  );
}
