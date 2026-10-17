const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const { resolveMapLink } = require('../controllers/geoController');

router.post('/resolve', requireAdmin, resolveMapLink);

module.exports = router;
