
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

(async () => {
  try {
    const email = (process.argv[2] || process.env.ADMIN_EMAIL || 'admin@letscalm.com').trim().toLowerCase();
    const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'Admin@12345';
    const name = process.env.ADMIN_NAME || 'Admin';
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO admins (name, email, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [name, email, hash]
    );
    console.log(`✔ Admin ready  ->  email: ${email}   password: ${password}`);
  } catch (err) {
    console.error('✖ Could not create admin:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
