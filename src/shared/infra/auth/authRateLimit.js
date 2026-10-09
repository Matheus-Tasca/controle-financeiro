import { createHash } from 'node:crypto';
import { redisClient } from './redis.js';

const incrementWindowScript = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
  return { count, redis.call('TTL', KEYS[1]) }
`;

async function checkWindow(key, limit, windowSeconds) {
  const [count, ttl] = await redisClient.eval(incrementWindowScript, {
    keys: [key],
    arguments: [String(windowSeconds)],
  });
  return {
    allowed: Number(count) <= limit,
    retryAfter: Math.max(Number(ttl), 1),
  };
}

function reject(res, retryAfter) {
  res.set('Retry-After', String(retryAfter));
  return res.status(429).json({
    error: 'Muitas tentativas. Aguarde antes de tentar novamente.',
  });
}

function failClosed(res, error) {
  console.error('Authentication rate limiter unavailable:', {
    name: error?.name,
    code: error?.code,
  });
  return res.status(503).json({
    error: 'Autenticação temporariamente indisponível. Tente novamente.',
  });
}

export async function limitLoginAttempts(req, res, next) {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const ipWindow = await checkWindow(`rate:auth:login:ip:${ip}`, 20, 900);
    if (!ipWindow.allowed) return reject(res, ipWindow.retryAfter);

    const username = req.body?.username;
    if (typeof username === 'string' && username.length <= 100) {
      const usernameHash = createHash('sha256')
        .update(username.toLowerCase())
        .digest('hex');
      const accountWindow = await checkWindow(
        `rate:auth:login:account:${ip}:${usernameHash}`,
        5,
        900
      );
      if (!accountWindow.allowed) return reject(res, accountWindow.retryAfter);
    }
    return next();
  } catch (error) {
    return failClosed(res, error);
  }
}

export async function limitRegistrationAttempts(req, res, next) {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const window = await checkWindow(`rate:auth:register:ip:${ip}`, 5, 3600);
    if (!window.allowed) return reject(res, window.retryAfter);
    return next();
  } catch (error) {
    return failClosed(res, error);
  }
}
