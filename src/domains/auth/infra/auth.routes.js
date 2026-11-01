import express from 'express';
import { randomUUID } from 'node:crypto';
import { User } from '../entities/User.js';
import { UserRepository } from './UserRepository.js';
import {
  hashPassword,
  verifyPassword,
} from '../../../shared/infra/auth/password.js';
import { createAccessToken } from '../../../shared/infra/auth/jwt.js';
import { redisClient } from '../../../shared/infra/auth/redis.js';
import {
  limitLoginAttempts,
  limitRegistrationAttempts,
} from '../../../shared/infra/auth/authRateLimit.js';
import { sendInternalError } from '../../../shared/infra/http/errors.js';

const authRouter = express.Router();

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_TOKEN_TTL_SECONDS = 86400; // 24 horas
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_PASSWORD_BYTES = 512;
const MAX_USERNAME_LENGTH = 100;

function getRefreshTokenFromCookie(req) {
  const cookieHeader = req.headers.cookie || '';
  const refreshCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${REFRESH_COOKIE_NAME}=`));

  if (!refreshCookie) {
    return null;
  }

  try {
    return decodeURIComponent(
      refreshCookie.slice(REFRESH_COOKIE_NAME.length + 1)
    );
  } catch {
    return null;
  }
}

function setRefreshCookie(res, token) {
  const cookiePath = process.env.REFRESH_COOKIE_PATH || '/auth';
  const isSecure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=${cookiePath}; Max-Age=${REFRESH_TOKEN_TTL_SECONDS}${isSecure}`
  );
}

function clearRefreshCookie(res) {
  const cookiePath = process.env.REFRESH_COOKIE_PATH || '/auth';
  const isSecure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `${REFRESH_COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=${cookiePath}; Max-Age=0${isSecure}`
  );
}

authRouter.post('/register', limitRegistrationAttempts, async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res
        .status(400)
        .json({ error: 'username and password are required' });
    }
    if (!username.trim() || username.length > MAX_USERNAME_LENGTH) {
      return res
        .status(400)
        .json({ error: 'Username must have 1 to 100 characters' });
    }

    if (
      password.length < MIN_PASSWORD_LENGTH ||
      Array.from(password).length > MAX_PASSWORD_LENGTH ||
      Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES
    ) {
      return res
        .status(400)
        .json({ error: 'Password must have 8 to 128 characters' });
    }

    const userRepository = new UserRepository();

    if (await userRepository.findByUsername(username)) {
      return res.status(409).json({ error: 'Username already in use' });
    }

    const passwordHash = await hashPassword(password);
    const user = await userRepository.save(
      new User({ username, passwordHash })
    );

    return res.status(201).json({ id: user.id, username: user.username });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already in use' });
    }
    return sendInternalError(req, res, error, 'auth.register');
  }
});

authRouter.post('/login', limitLoginAttempts, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const isInvalidInput =
      typeof username !== 'string' ||
      !username.trim() ||
      username.length > MAX_USERNAME_LENGTH ||
      typeof password !== 'string' ||
      Array.from(password).length > MAX_PASSWORD_LENGTH ||
      Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES;

    if (isInvalidInput) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const userRepository = new UserRepository();
    const foundUser = await userRepository.findByUsername(username);

    if (
      !foundUser ||
      !(await verifyPassword(password, foundUser.passwordHash))
    ) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const refreshToken = randomUUID();
    const accessToken = createAccessToken(foundUser.id);

    await redisClient.set(foundUser.id, refreshToken, {
      EX: REFRESH_TOKEN_TTL_SECONDS,
    });
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      userId: foundUser.id,
      accessToken,
      acessToken: accessToken, // Mantido para compatibilidade reversa
    });
  } catch (error) {
    return sendInternalError(req, res, error, 'auth.login');
  }
});

authRouter.post('/refreshToken', async (req, res) => {
  try {
    const { userId } = req.body;
    const refreshToken = getRefreshTokenFromCookie(req);

    if (
      !userId ||
      !refreshToken ||
      (await redisClient.get(userId)) !== refreshToken
    ) {
      clearRefreshCookie(res);
      return res
        .status(401)
        .json({ error: 'Refresh token invalid or expired; please log in' });
    }

    const newRefreshToken = randomUUID();
    const accessToken = createAccessToken(userId);

    const isRotated = await redisClient.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2], 'EX', 86400); return 1 else return 0 end",
      { keys: [userId], arguments: [refreshToken, newRefreshToken] }
    );

    if (!isRotated) {
      clearRefreshCookie(res);
      return res
        .status(401)
        .json({ error: 'Refresh token invalid or expired; please log in' });
    }

    setRefreshCookie(res, newRefreshToken);
    return res.status(200).json({
      userId,
      accessToken,
      acessToken: accessToken, // Mantido para compatibilidade reversa
    });
  } catch (error) {
    return sendInternalError(req, res, error, 'auth.refresh');
  }
});

authRouter.post('/logout', async (req, res) => {
  try {
    const { userId } = req.body;
    const refreshToken = getRefreshTokenFromCookie(req);

    if (userId && refreshToken) {
      await redisClient.eval(
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
        { keys: [userId], arguments: [refreshToken] }
      );
    }

    clearRefreshCookie(res);
    return res.sendStatus(204);
  } catch (error) {
    return sendInternalError(req, res, error, 'auth.logout');
  }
});

export default authRouter;
