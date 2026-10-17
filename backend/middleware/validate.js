const fs = require('fs');
const { MAX_PHOTOS } = require('./upload');

const removeFiles = (files = []) => files.forEach((f) => fs.unlink(f.path, () => {}));

const parseKeepIds = (raw) => {
  if (raw === undefined || raw === '') return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  } catch { return []; }
};

const validateHotel = (isCreate) => (req, res, next) => {
  const { title, description, latitude, longitude, price } = req.body;
  const files = req.files || [];
  const errors = {};

  const keepIds = isCreate ? [] : parseKeepIds(req.body.keepImageIds);
  req.keepIds = keepIds;
  const totalPhotos = keepIds.length + files.length;
  if (totalPhotos < 1) errors.images = 'Please add at least one hotel photo (2–3 recommended).';
  else if (totalPhotos > MAX_PHOTOS) errors.images = `A hotel can have at most ${MAX_PHOTOS} photos.`;

  if (!title || !title.trim()) errors.title = 'Title is required.';
  else if (title.trim().length > 150) errors.title = 'Title must be 150 characters or fewer.';

  if (!description || !description.trim()) errors.description = 'Description is required.';

  const isNum = (v) => v !== undefined && v !== null && String(v).trim() !== '' && Number.isFinite(Number(v));

  if (!isNum(latitude) || Number(latitude) < -90 || Number(latitude) > 90)
    errors.latitude = 'Latitude must be a number between -90 and 90.';
  if (!isNum(longitude) || Number(longitude) < -180 || Number(longitude) > 180)
    errors.longitude = 'Longitude must be a number between -180 and 180.';
  if (!isNum(price) || Number(price) < 0) errors.price = 'Price must be a valid positive number.';

  const b = req.body;
  const int = (v, d) => (v === undefined || String(v).trim() === '' ? d : Number(v));
  const city = String(b.city || '').trim();
  if (!city) errors.city = 'City / destination is required.';
  else if (city.length > 100) errors.city = 'City must be 100 characters or fewer.';
  const star = int(b.star_class, null);
  if (star !== null && !(Number.isInteger(star) && star >= 1 && star <= 5)) errors.star_class = 'Star class must be 1 to 5.';
  const ptype = String(b.property_type || 'Hotel').trim();
  if (!['Hotel', 'Apartment', 'Resort', 'Guesthouse', 'Villa', 'Homestay'].includes(ptype)) errors.property_type = 'Choose a valid property type.';
  const maxGuests = int(b.max_guests, 2);
  if (!Number.isInteger(maxGuests) || maxGuests < 1 || maxGuests > 20) errors.max_guests = 'Guests per room must be 1 to 20.';
  const totalRooms = int(b.total_rooms, 10);
  if (!Number.isInteger(totalRooms) || totalRooms < 1 || totalRooms > 1000) errors.total_rooms = 'Rooms must be 1 or more.';
  const dist = int(b.distance_km, null);
  if (dist !== null && (!Number.isFinite(dist) || dist < 0 || dist > 999)) errors.distance_km = 'Distance must be 0 or more (km).';
  let amenities = [];
  try { const a = JSON.parse(b.amenities || '[]'); amenities = Array.isArray(a) ? a.map(String).filter((x) => /^[a-z0-9-]{1,40}$/.test(x)) : []; } catch { /* ignore */ }
  req.extra = {
    city, star_class: star, property_type: ptype, max_guests: maxGuests, total_rooms: totalRooms,
    distance_km: dist, free_cancellation: b.free_cancellation === 'true' || b.free_cancellation === true, amenities,
  };

  if (Object.keys(errors).length) {
    removeFiles(files);
    return res.status(400).json({ message: 'Please fix the highlighted fields.', errors });
  }
  next();
};

module.exports = validateHotel;
