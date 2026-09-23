const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { getAccountBlock, blockedResponse } = require('../utils/accountStatus');

// The JWT only proves who someone is; their role and account status come from
// the database so a ban or role change applies to existing sessions instead of
// waiting for the token to expire. Cached briefly to avoid a DB round-trip on
// every request; admin actions that change a user call invalidateUserCache().
const USER_CACHE_TTL_MS = 30 * 1000;
const userCache = new Map();

async function loadAuthUser(id) {
  const cached = userCache.get(id);
  if (cached && Date.now() - cached.at < USER_CACHE_TTL_MS) return cached.user;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, accountStatus: true, statusReason: true, suspendedUntil: true, isSuperAdmin: true }
  });
  userCache.set(id, { user, at: Date.now() });
  return user;
}

function invalidateUserCache(id) {
  userCache.delete(Number(id));
}

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Not authorized, no token provided!" });
  }

  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Not authorized, invalid token!" });
  }

  const user = await loadAuthUser(decoded.id);
  if (!user) {
    return res.status(401).json({ message: "Not authorized, account no longer exists.", code: "ACCOUNT_DELETED" });
  }

  const block = getAccountBlock(user);
  if (block) {
    invalidateUserCache(user.id);
    return blockedResponse(res, block);
  }
  // An expired suspension was just lifted in the DB; drop the stale cached copy.
  if (user.accountStatus !== 'ACTIVE') invalidateUserCache(user.id);

  req.user = { id: user.id, email: user.email, role: user.role, isSuperAdmin: user.isSuperAdmin };
  next();
};

// For pages anyone may open, where being signed in adds something (for
// example marking the events you already registered for). A missing or bad
// token just means "not signed in", never an error.
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    const user = await loadAuthUser(decoded.id);
    if (user && !getAccountBlock(user)) {
      req.user = { id: user.id, email: user.email, role: user.role, isSuperAdmin: user.isSuperAdmin };
    }
  } catch {
    // Not signed in; carry on as a guest.
  }
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') return next();
  res.status(403).json({ message: "Access denied. Admins only!" });
};

const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN' && req.user.isSuperAdmin) return next();
  res.status(403).json({ message: "Access denied. Super-admins only." });
};

module.exports = { protect, optionalAuth, adminOnly, superAdminOnly, invalidateUserCache };
