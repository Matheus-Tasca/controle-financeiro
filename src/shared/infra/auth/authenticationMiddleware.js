import { verifyAccessToken } from './jwt.js';

export function authenticationMiddleware(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  const claims = scheme === 'Bearer' ? verifyAccessToken(token) : null;

  if (!claims)
    return res.status(401).json({ error: 'Authentication required' });

  req.userId = claims.userId;

  return next();
}
