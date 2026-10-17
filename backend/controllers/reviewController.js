const pool = require('../config/db');

const hotelId = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) { res.status(400).json({ message: 'Invalid hotel id.' }); return null; }
  return id;
};

exports.listReviews = async (req, res, next) => {
  try {
    const id = hotelId(req, res);
    if (!id) return;
    const [list, summary] = await Promise.all([
      pool.query(
        `SELECT id, reviewer_name, rating, comment, created_at
           FROM reviews WHERE hotel_id = $1 ORDER BY created_at DESC, id DESC LIMIT 50`, [id]),
      pool.query(
        `SELECT COUNT(*)::int AS count, ROUND(AVG(rating)::numeric, 1) AS average
           FROM reviews WHERE hotel_id = $1`, [id]),
    ]);
    res.json({ reviews: list.rows, count: summary.rows[0].count, average: summary.rows[0].average });
  } catch (err) {
    next(err);
  }
};

exports.createReview = async (req, res, next) => {
  try {
    const id = hotelId(req, res);
    if (!id) return;
    const name = String(req.body.reviewer_name || '').trim();
    const comment = String(req.body.comment || '').trim();
    const rating = Number(req.body.rating);
    const errors = {};
    if (!name) errors.reviewer_name = 'Please enter your name.';
    else if (name.length > 100) errors.reviewer_name = 'Name must be 100 characters or fewer.';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = 'Please choose a rating from 1 to 5.';
    if (!comment) errors.comment = 'Please write a short review.';
    else if (comment.length > 1000) errors.comment = 'Review must be 1000 characters or fewer.';
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please fix the highlighted fields.', errors });

    const exists = await pool.query('SELECT 1 FROM hotels WHERE id = $1', [id]);
    if (!exists.rows.length) return res.status(404).json({ message: 'Hotel not found.' });

    const { rows } = await pool.query(
      `INSERT INTO reviews (hotel_id, reviewer_name, rating, comment)
       VALUES ($1, $2, $3, $4) RETURNING id, reviewer_name, rating, comment, created_at`,
      [id, name, rating, comment]
    );
    res.status(201).json({ message: 'Thanks! Your review has been posted.', review: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const id = hotelId(req, res);
    const reviewId = Number(req.params.reviewId);
    if (!id) return;
    if (!Number.isInteger(reviewId) || reviewId < 1) return res.status(400).json({ message: 'Invalid review id.' });
    const { rowCount } = await pool.query('DELETE FROM reviews WHERE id = $1 AND hotel_id = $2', [reviewId, id]);
    if (!rowCount) return res.status(404).json({ message: 'Review not found.' });
    res.json({ message: 'Review deleted.', id: reviewId });
  } catch (err) {
    next(err);
  }
};
