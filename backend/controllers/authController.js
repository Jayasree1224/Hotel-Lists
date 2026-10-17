const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken } = require('../middleware/auth');

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

exports.login = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const errors = {};
    if (!email) errors.email = 'Email is required.';
    if (!password) errors.password = 'Password is required.';
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Please fill in both fields.', errors });

    const { rows } = await pool.query('SELECT id, name, email, password_hash FROM admins WHERE email = $1', [email]);
    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin ? admin.password_hash : DUMMY_HASH);
    if (!admin || !ok) return res.status(401).json({ message: 'Invalid email or password.' });

    res.json({ token: signToken(admin), admin: { id: admin.id, name: admin.name, email: admin.email } });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email FROM admins WHERE id = $1', [req.admin.id]);
    if (!rows.length) return res.status(401).json({ message: 'Admin account no longer exists.' });
    res.json({ admin: rows[0] });
  } catch (err) {
    next(err);
  }
};
