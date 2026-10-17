const pool = require('../config/db');

const DAY = 86400000;
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !isNaN(Date.parse(v));

exports.createBooking = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid hotel id.' });
    const { guest_name, guest_email, checkIn, checkOut } = req.body;
    const adults = parseInt(req.body.adults, 10) || 1;
    const children = parseInt(req.body.children, 10) || 0;
    const rooms = parseInt(req.body.rooms, 10) || 1;

    const errors = {};
    if (!String(guest_name || '').trim()) errors.guest_name = 'Please enter your name.';
    if (!isDate(checkIn) || !isDate(checkOut)) errors.dates = 'Choose valid check-in and check-out dates.';
    else if (Date.parse(checkOut) <= Date.parse(checkIn)) errors.dates = 'Check-out must be after check-in.';
    else if (Date.parse(checkIn) < Date.parse(new Date().toISOString().slice(0, 10))) errors.dates = 'Check-in cannot be in the past.';
    if (adults < 1 || children < 0 || rooms < 1 || rooms > 10) errors.guests = 'Check the number of guests and rooms.';
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please fix the highlighted fields.', errors });

    await client.query('BEGIN');
    const h = (await client.query('SELECT id, price, max_guests, total_rooms FROM hotels WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!h) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Hotel not found.' }); }
    if (h.max_guests * rooms < adults + children) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `This hotel fits ${h.max_guests} guests per room. Add more rooms.`, errors: { guests: 'Too many guests for the rooms.' } });
    }
    const used = (await client.query(
      `SELECT COALESCE(SUM(rooms), 0)::int AS n FROM bookings
        WHERE hotel_id = $1 AND status = 'confirmed' AND check_in < $3::date AND check_out > $2::date`, [id, checkIn, checkOut])).rows[0].n;
    if (h.total_rooms - used < rooms) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Sorry, not enough rooms are free for those dates.', errors: { dates: 'Sold out for these dates.' } });
    }
    const nights = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / DAY);
    const { rows } = await client.query(
      `INSERT INTO bookings (hotel_id, guest_name, guest_email, check_in, check_out, adults, children, rooms, total_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, String(guest_name).trim(), String(guest_email || '').trim() || null, checkIn, checkOut, adults, children, rooms, h.price * nights * rooms]);
    await client.query('COMMIT');
    res.status(201).json({ message: 'Booking confirmed!', booking: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};
