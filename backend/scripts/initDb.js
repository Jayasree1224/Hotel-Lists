
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

(async () => {
  try {
    const dir = path.join(__dirname, '..', '..', 'database');
    await pool.query(fs.readFileSync(path.join(dir, 'migration.sql'), 'utf8'));
    console.log('✔ tables are ready (hotels, hotel_images, reviews, admins)');
    await pool.query(fs.readFileSync(path.join(dir, 'migration_v2.sql'), 'utf8'));
    console.log('✔ search features ready (city, amenities, bookings, indexes)');
    if (process.argv.includes('--seed')) {
      const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM hotels');
      if (rows[0].n === 0) {
        await pool.query(fs.readFileSync(path.join(dir, 'seed.sql'), 'utf8'));
        console.log('✔ demo hotels inserted');
      } else {
        console.log('• hotels table already has data - demo hotels skipped');
      }
      await pool.query(fs.readFileSync(path.join(dir, 'seed_v2.sql'), 'utf8'));
      console.log('✔ demo cities / amenities / sample booking added');
      await pool.query(fs.readFileSync(path.join(dir, 'seed_reviews.sql'), 'utf8'));
      console.log('✔ demo reviews inserted (hotels without reviews only)');
    }
  } catch (err) {
    console.error('✖ Database setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
