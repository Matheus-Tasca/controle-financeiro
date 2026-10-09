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
const refreshCookieName = 'refreshToken';

function getRefreshTokenFromCookie(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${refreshCookieName}=`));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(refreshCookieName.length + 1));
  } catch {
    return null;
  }
}

function setRefreshCookie(res, token) {
  const cookiePath = process.env.REFRESH_COOKIE_PATH || '/auth';
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `${refreshCookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=${cookiePath}; Max-Age=86400${secure}`
  );
}

function clearRefreshCookie(res) {
  const cookiePath = process.env.REFRESH_COOKIE_PATH || '/auth';
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `${refreshCookieName}=; HttpOnly; SameSite=Strict; Path=${cookiePath}; Max-Age=0${secure}`
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
    if (!username.trim() || username.length > 100) {
      return res
        .status(400)
        .json({ error: 'Username must have 1 to 100 characters' });
    }

    if (
      password.length < 8 ||
      Array.from(password).length > 128 ||
      Buffer.byteLength(password, 'utf8') > 512
    )
      return res
        .status(400)
        .json({ error: 'Password must have 8 to 128 characters' });

    const users = new UserRepository();

    if (await users.findByUsername(username)) {
      return res.status(409).json({ error: 'Username  already in use' });
    }

    const user = await users.save(
      new User({ username, passwordHash: await hashPassword(password) })
    );
    return res.status(201).json({ id: user.id, username: user.username });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already in use' });
    }
    console.log(error.message);
    return sendInternalError(req, res, error, 'auth.register');
  }
});

authRouter.post('/login', limitLoginAttempts, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (
      typeof username !== 'string' ||
      !username.trim() ||
      username.length > 100 ||
      typeof password !== 'string' ||
      Array.from(password).length > 128 ||
      Buffer.byteLength(password, 'utf8') > 512
    ) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const foundUser = username
      ? await new UserRepository().findByUsername(username)
      : null;
    if (
      !foundUser ||
      !(await verifyPassword(password, foundUser.passwordHash))
    ) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const refreshToken = randomUUID();
    const acessToken = createAccessToken(foundUser.id);
    await redisClient.set(foundUser.id, refreshToken, { EX: 86400 });
    setRefreshCookie(res, refreshToken);
    return res.status(200).json({ userId: foundUser.id, acessToken });
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
    const acessToken = createAccessToken(userId);
    const rotated = await redisClient.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2], 'EX', 86400); return 1 else return 0 end",
      { keys: [userId], arguments: [refreshToken, newRefreshToken] }
    );
    if (!rotated) {
      clearRefreshCookie(res);
      return res
        .status(401)
        .json({ error: 'Refresh token invalid or expired; please log in' });
    }
    setRefreshCookie(res, newRefreshToken);
    return res.status(200).json({ userId, acessToken });
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
