const { Pool, types } = require('pg');
require('dotenv').config();
types.setTypeParser(1700, (v) => parseFloat(v));

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.on('error', (err) => console.error('Unexpected PostgreSQL error', err));

module.exports = pool;
