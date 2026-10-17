const router = require('express').Router();
const { requireAdmin, rateLimit } = require('../middleware/auth');
const { login, me } = require('../controllers/authController');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: 'Too many login attempts. Try again in a few minutes.' });

router.post('/login', loginLimiter, login);
router.get('/me', requireAdmin, me);

module.exports = router;
