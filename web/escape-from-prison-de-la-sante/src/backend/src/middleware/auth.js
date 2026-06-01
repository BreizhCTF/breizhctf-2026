import jwt from 'jsonwebtoken';

export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export function extractUser(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return verifyToken(authHeader.slice(7));
  }
  const cookieToken = req.cookies?.token;
  if (cookieToken) {
    return verifyToken(cookieToken);
  }
  return null;
}

export function requireRole(user, ...roles) {
  if (!user) {
    throw new Error('Non authentifié');
  }
  if (roles.length > 0 && !roles.includes(user.role)) {
    throw new Error('Accès non autorisé');
  }
}

export function isGuardOrAbove(user) {
  return user && (user.role === 'guard' || user.role === 'director');
}
