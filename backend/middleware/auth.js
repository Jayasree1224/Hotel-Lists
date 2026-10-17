const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

exports.signToken = (admin) =>
  jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

exports.requireAdmin = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in as admin to do that.' });
  try {
    const payload = jwt.verify(token, SECRET);
    if (payload.role !== 'admin') throw new Error('not admin');
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
};

exports.rateLimit = ({ windowMs, max, message }) => {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    const now = Date.now();
    const rec = hits.get(req.ip);
    if (!rec || rec.reset < now) { hits.set(req.ip, { count: 1, reset: now + windowMs }); return next(); }
    if (++rec.count > max) return res.status(429).json({ message });
    next();
  };
};
