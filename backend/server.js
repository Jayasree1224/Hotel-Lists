require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const pool = require('./config/db');
const hotelRoutes = require('./routes/hotelRoutes');
const authRoutes = require('./routes/authRoutes');
const geoRoutes = require('./routes/geoRoutes');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('✖ JWT_SECRET is missing (or too short) in backend/.env - add a long random string.');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/hotels', hotelRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be 5 MB or smaller.'
      : err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT' ? 'A hotel can have at most 3 photos.'
      : err.message;
    return res.status(400).json({ message, errors: { images: message } });
  }
  if (err.status === 400)
    return res.status(400).json({ message: err.message, errors: err.field ? { [err.field]: err.message } : {} });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 5000;
pool
  .query('SELECT 1')
  .then(() => {
    console.log('✔ PostgreSQL connected');
    app.listen(PORT, () => console.log(`✔ API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('✖ Could not connect to PostgreSQL:', err.message);
    process.exit(1);
  });
