const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const removeImage = (imagePath) => {
  if (!imagePath) return;
  fs.unlink(path.join(__dirname, '..', imagePath), () => {}); // optional clean-up, ignore errors
};
const removeUploaded = (files = []) => files.forEach((f) => fs.unlink(f.path, () => {}));
const parseId = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ message: 'Invalid hotel id.' });
    return null;
  }
  return id;
};

const setAmenities = async (client, hotelId, slugs = []) => {
  await client.query('DELETE FROM hotel_amenities WHERE hotel_id = $1', [hotelId]);
  if (slugs.length) {
    await client.query(
      `INSERT INTO hotel_amenities (hotel_id, amenity_id)
       SELECT $1, id FROM amenities WHERE slug = ANY($2::text[])`, [hotelId, slugs]);
  }
};

const PROPERTY_TYPES = ['Hotel', 'Apartment', 'Resort', 'Guesthouse', 'Villa', 'Homestay'];
const csv = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);
const DAY = 86400000;
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !isNaN(Date.parse(v));

const HOTELS_WITH_RATING = `
  (SELECT h0.*, r.avg_rating, COALESCE(r.review_count, 0) AS review_count
     FROM hotels h0
     LEFT JOIN (SELECT hotel_id, ROUND(AVG(rating)::numeric, 1) AS avg_rating, COUNT(*)::int AS review_count
                  FROM reviews GROUP BY hotel_id) r ON r.hotel_id = h0.id) h`;

const SORTS = {
  top:        'COALESCE(h.avg_rating, 0) * LN(1 + h.review_count) DESC, h.created_at DESC, h.id DESC',
  price_asc:  'h.price ASC, h.id ASC',
  price_desc: 'h.price DESC, h.id DESC',
  rating:     'h.avg_rating DESC NULLS LAST, h.review_count DESC, h.id DESC',
  distance:   'h.distance_km ASC NULLS LAST, h.id ASC',
  newest:     'h.created_at DESC, h.id DESC',
};

exports.getHotels = async (req, res, next) => {
  try {
    const q = req.query;
    const page = Math.max(parseInt(q.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q.limit, 10) || 6, 1), 50);
    const offset = (page - 1) * limit;

    const adults = Math.min(Math.max(parseInt(q.adults, 10) || 2, 1), 30);
    const children = Math.min(Math.max(parseInt(q.children, 10) || 0, 0), 20);
    const rooms = Math.min(Math.max(parseInt(q.rooms, 10) || 1, 1), 10);
    const guests = adults + children;

    let nights = 1;
    const hasDates = isDate(q.checkIn) && isDate(q.checkOut);
    if (q.checkIn || q.checkOut) {
      if (!hasDates) return res.status(400).json({ message: 'Please choose both check-in and check-out dates.', errors: { dates: 'Choose both dates.' } });
      nights = Math.round((Date.parse(q.checkOut) - Date.parse(q.checkIn)) / DAY);
      if (nights < 1) return res.status(400).json({ message: 'Check-out must be after check-in.', errors: { dates: 'Check-out must be after check-in.' } });
      if (nights > 30) return res.status(400).json({ message: 'You can search up to 30 nights at a time.', errors: { dates: 'Maximum 30 nights.' } });
      if (Date.parse(q.checkIn) < Date.parse(new Date().toISOString().slice(0, 10)))
        return res.status(400).json({ message: 'Check-in cannot be in the past.', errors: { dates: 'Check-in cannot be in the past.' } });
    }

    const conditions = [];
    const values = [];
    const add = (v) => { values.push(v); return `$${values.length}`; };
    const totalExpr = `(h.price * ${nights} * ${rooms})`; // nights / rooms are validated integers

    const destination = String(q.destination ?? q.search ?? '').trim();
    if (destination) {
      const p = add(`%${destination}%`);
      conditions.push(`(h.city ILIKE ${p} OR h.title ILIKE ${p})`);
    }
    conditions.push(`h.max_guests * ${add(rooms)}::int >= ${add(guests)}::int`);
    if (hasDates) {
      const ci = add(q.checkIn); const co = add(q.checkOut); const r = add(rooms);
      conditions.push(`h.total_rooms - COALESCE((SELECT SUM(b.rooms) FROM bookings b
                         WHERE b.hotel_id = h.id AND b.status = 'confirmed'
                           AND b.check_in < ${co}::date AND b.check_out > ${ci}::date), 0) >= ${r}::int`);
    }
    if (q.minPrice !== undefined && q.minPrice !== '' && !isNaN(q.minPrice)) conditions.push(`${totalExpr} >= ${add(Number(q.minPrice))}`);
    if (q.maxPrice !== undefined && q.maxPrice !== '' && !isNaN(q.maxPrice)) conditions.push(`${totalExpr} <= ${add(Number(q.maxPrice))}`);
    if (q.minScore !== undefined && q.minScore !== '' && !isNaN(q.minScore)) conditions.push(`h.avg_rating * 2 >= ${add(Number(q.minScore))}`);

    const stars = csv(q.stars).map(Number).filter((n) => n >= 1 && n <= 5);
    if (stars.length) conditions.push(`h.star_class = ANY(${add(stars)}::int[])`);
    const types = csv(q.types).filter((t) => PROPERTY_TYPES.includes(t));
    if (types.length) conditions.push(`h.property_type = ANY(${add(types)}::text[])`);
    const amenities = csv(q.amenities);
    if (amenities.length) {
      conditions.push(`(SELECT COUNT(DISTINCT a.slug) FROM hotel_amenities ha JOIN amenities a ON a.id = ha.amenity_id
                         WHERE ha.hotel_id = h.id AND a.slug = ANY(${add(amenities)}::text[])) = ${add(amenities.length)}::int`);
    }
    if (q.maxDistance !== undefined && q.maxDistance !== '' && !isNaN(q.maxDistance)) conditions.push(`h.distance_km <= ${add(Number(q.maxDistance))}`);
    if (q.freeCancellation === '1' || q.freeCancellation === 'true') conditions.push('h.free_cancellation = TRUE');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = SORTS[q.sort] || SORTS.top;

    const { rows: [{ total }] } = await pool.query(`SELECT COUNT(*)::int AS total FROM ${HOTELS_WITH_RATING} ${where}`, values);

    const list = await pool.query(
      `SELECT h.id, h.title, h.description, h.latitude, h.longitude, h.price, h.created_at,
              h.city, h.star_class, h.property_type, h.max_guests, h.distance_km, h.free_cancellation,
              h.avg_rating, h.review_count,
              ${totalExpr} AS total_price,
              COALESCE((SELECT image_path FROM hotel_images WHERE hotel_id = h.id ORDER BY position, id LIMIT 1), NULLIF(h.image, '')) AS image,
              (SELECT COUNT(*)::int FROM hotel_images WHERE hotel_id = h.id) AS image_count,
              (SELECT COALESCE(array_agg(a.name ORDER BY a.name), '{}') FROM hotel_amenities ha JOIN amenities a ON a.id = ha.amenity_id WHERE ha.hotel_id = h.id) AS amenities,
              (SELECT json_build_object('name', rv.reviewer_name, 'rating', rv.rating, 'comment', LEFT(rv.comment, 140))
                 FROM reviews rv WHERE rv.hotel_id = h.id ORDER BY rv.created_at DESC, rv.id DESC LIMIT 1) AS top_review
         FROM ${HOTELS_WITH_RATING} ${where}
        ORDER BY ${orderBy}
        LIMIT ${add(limit)} OFFSET ${add(offset)}`,
      values
    );

    res.json({ data: list.rows, total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1), nights, rooms, guests });
  } catch (err) {
    next(err);
  }
};

exports.getFacets = async (req, res, next) => {
  try {
    const [types, stars, score, ams, cities, cancel] = await Promise.all([
      pool.query('SELECT property_type AS value, COUNT(*)::int AS count FROM hotels GROUP BY 1 ORDER BY 2 DESC'),
      pool.query('SELECT star_class AS value, COUNT(*)::int AS count FROM hotels WHERE star_class IS NOT NULL GROUP BY 1 ORDER BY 1 DESC'),
      pool.query(`SELECT COUNT(*) FILTER (WHERE avg_rating * 2 >= 9)::int AS s9, COUNT(*) FILTER (WHERE avg_rating * 2 >= 8)::int AS s8,
                         COUNT(*) FILTER (WHERE avg_rating * 2 >= 7)::int AS s7, COUNT(*) FILTER (WHERE avg_rating * 2 >= 6)::int AS s6
                    FROM ${HOTELS_WITH_RATING}`),
      pool.query(`SELECT a.slug, a.name, COUNT(ha.hotel_id)::int AS count FROM amenities a
                    LEFT JOIN hotel_amenities ha ON ha.amenity_id = a.id GROUP BY a.id ORDER BY count DESC, a.name`),
      pool.query("SELECT city AS value, COUNT(*)::int AS count FROM hotels WHERE city <> '' GROUP BY 1 ORDER BY 2 DESC, 1"),
      pool.query('SELECT COUNT(*)::int AS count FROM hotels WHERE free_cancellation'),
    ]);
    res.json({
      propertyTypes: types.rows, stars: stars.rows, score: score.rows[0], amenities: ams.rows,
      cities: cities.rows, freeCancellation: cancel.rows[0].count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getHotelById = async (req, res, next) => {
  try {
    const id = parseId(req, res);
    if (!id) return;
    const { rows } = await pool.query(
      `SELECT h.*,
              (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE hotel_id = h.id) AS avg_rating,
              (SELECT COUNT(*)::int FROM reviews WHERE hotel_id = h.id) AS review_count
         FROM hotels h WHERE h.id = $1`, [id]);
    if (!rows.length) return res.status(404).json({ message: 'Hotel not found.' });
    const imgs = await pool.query(
      'SELECT id, image_path FROM hotel_images WHERE hotel_id = $1 ORDER BY position, id', [id]);
    const ams = await pool.query(
      `SELECT a.slug, a.name FROM hotel_amenities ha JOIN amenities a ON a.id = ha.amenity_id WHERE ha.hotel_id = $1 ORDER BY a.name`, [id]);
    const hotel = rows[0];
    hotel.amenities = ams.rows;
    hotel.images = imgs.rows;
    if (!hotel.images.length && hotel.image) hotel.images = [{ id: null, image_path: hotel.image }];
    res.json(hotel);
  } catch (err) {
    next(err);
  }
};

exports.createHotel = async (req, res, next) => {
  const files = req.files || [];
  const client = await pool.connect();
  try {
    const { title, description, latitude, longitude, price } = req.body;
    const x = req.extra; // validated city / class / type / capacity / amenities
    const paths = files.map((f) => `/uploads/${f.filename}`);
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO hotels (title, description, latitude, longitude, price, image,
                           city, star_class, property_type, max_guests, total_rooms, distance_km, free_cancellation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [title.trim(), description.trim(), latitude, longitude, price, paths[0],
       x.city, x.star_class, x.property_type, x.max_guests, x.total_rooms, x.distance_km, x.free_cancellation]
    );
    await setAmenities(client, rows[0].id, x.amenities);
    for (let i = 0; i < paths.length; i += 1) {
      await client.query('INSERT INTO hotel_images (hotel_id, image_path, position) VALUES ($1, $2, $3)', [rows[0].id, paths[i], i]);
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Hotel added successfully!', hotel: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    removeUploaded(files);
    next(err);
  } finally {
    client.release();
  }
};

exports.updateHotel = async (req, res, next) => {
  const files = req.files || [];
  const client = await pool.connect();
  try {
    const id = parseId(req, res);
    if (!id) { removeUploaded(files); return; }

    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM hotels WHERE id = $1 FOR UPDATE', [id]);
    if (!existing.rows.length) {
      await client.query('ROLLBACK');
      removeUploaded(files);
      return res.status(404).json({ message: 'Hotel not found.' });
    }

    const current = (await client.query('SELECT id, image_path FROM hotel_images WHERE hotel_id = $1', [id])).rows;
    const byId = new Map(current.map((r) => [r.id, r]));
    const keep = req.keepIds.filter((k) => byId.has(k)); // ignore ids that do not belong to this hotel
    if (keep.length + files.length < 1 || keep.length + files.length > 3) {
      await client.query('ROLLBACK');
      removeUploaded(files);
      return res.status(400).json({ message: 'Please fix the highlighted fields.', errors: { images: 'A hotel needs between 1 and 3 photos.' } });
    }

    const toRemove = current.filter((r) => !keep.includes(r.id));
    if (toRemove.length) await client.query('DELETE FROM hotel_images WHERE id = ANY($1::int[])', [toRemove.map((r) => r.id)]);
    for (let i = 0; i < keep.length; i += 1) await client.query('UPDATE hotel_images SET position = $1 WHERE id = $2', [i, keep[i]]);
    const newPaths = files.map((f) => `/uploads/${f.filename}`);
    for (let i = 0; i < newPaths.length; i += 1) {
      await client.query('INSERT INTO hotel_images (hotel_id, image_path, position) VALUES ($1, $2, $3)', [id, newPaths[i], keep.length + i]);
    }
    const cover = (await client.query('SELECT image_path FROM hotel_images WHERE hotel_id = $1 ORDER BY position, id LIMIT 1', [id])).rows[0].image_path;

    const { title, description, latitude, longitude, price } = req.body;
    const x = req.extra;
    const { rows } = await client.query(
      `UPDATE hotels
          SET title = $1, description = $2, latitude = $3, longitude = $4, price = $5, image = $6,
              city = $8, star_class = $9, property_type = $10, max_guests = $11, total_rooms = $12,
              distance_km = $13, free_cancellation = $14
        WHERE id = $7 RETURNING *`,
      [title.trim(), description.trim(), latitude, longitude, price, cover, id,
       x.city, x.star_class, x.property_type, x.max_guests, x.total_rooms, x.distance_km, x.free_cancellation]
    );
    await setAmenities(client, id, x.amenities);
    await client.query('COMMIT');

    toRemove.forEach((r) => removeImage(r.image_path)); // removed photos no longer needed
    res.json({ message: 'Hotel updated successfully!', hotel: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    removeUploaded(files);
    next(err);
  } finally {
    client.release();
  }
};

exports.deleteHotel = async (req, res, next) => {
  try {
    const id = parseId(req, res);
    if (!id) return;
    const imgs = await pool.query('SELECT image_path FROM hotel_images WHERE hotel_id = $1', [id]);
    const { rows } = await pool.query('DELETE FROM hotels WHERE id = $1 RETURNING image', [id]); // photos + reviews cascade
    if (!rows.length) return res.status(404).json({ message: 'Hotel not found.' });
    const all = new Set([...imgs.rows.map((r) => r.image_path), rows[0].image]);
    all.forEach(removeImage);
    res.json({ message: 'Hotel deleted successfully!', id });
  } catch (err) {
    next(err);
  }
};
