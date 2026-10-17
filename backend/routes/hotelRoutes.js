const router = require('express').Router();
const upload = require('../middleware/upload');
const validateHotel = require('../middleware/validate');
const { requireAdmin, rateLimit } = require('../middleware/auth');
const c = require('../controllers/hotelController');
const r = require('../controllers/reviewController');
const b = require('../controllers/bookingController');

const reviewLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: 'Too many reviews. Please try again later.' });
const photos = upload.array('images', upload.MAX_PHOTOS);


router.get('/', c.getHotels);
router.get('/facets', c.getFacets); 
router.get('/:id', c.getHotelById);
router.get('/:id/reviews', r.listReviews);
router.post('/:id/reviews', reviewLimiter, r.createReview);
router.post('/:id/bookings', b.createBooking);

router.post('/', requireAdmin, photos, validateHotel(true), c.createHotel);
router.put('/:id', requireAdmin, photos, validateHotel(false), c.updateHotel);
router.delete('/:id', requireAdmin, c.deleteHotel);
router.delete('/:id/reviews/:reviewId', requireAdmin, r.deleteReview);

module.exports = router;
