import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { imageUrl, geoApi, reviewApi, parseCoordsFromText, looksLikeUrl, minDate } from '../store';
import { Stars, StarPicker, HotelMap } from './layout';

export const formatPrice = (n) =>
  `₹${Number(n).toLocaleString('en-IN')}`;

export const scoreLabel = (s) => {
  if (s >= 9) return 'Wonderful';
  if (s >= 8) return 'Very good';
  if (s >= 7) return 'Good';
  if (s >= 6) return 'Pleasant';
  return 'Fair';
};
export function HotelCard({
  hotel,
  stay = { nights: 1, rooms: 1 },
  onDelete
}) {
  const isAdmin = Boolean(useSelector((s) => s.auth.admin));

  const {
    id,
    title,
    price,
    total_price,
    description,
    image,
    image_count,
    avg_rating,
    review_count,
    city,
    star_class,
    property_type,
    distance_km,
    free_cancellation,
    amenities = [],
    top_review
  } = hotel;
  const score = avg_rating
    ? Number((avg_rating * 2).toFixed(1))
    : null;
  const multi = stay.nights > 1 || stay.rooms > 1;
  return (
    <article className="card">
      <Link
        to={`/hotels/${id}`}
        className="card-media"
        aria-label={`View details of ${title}`}
      >
        {image ? (
          <img
            src={imageUrl(image)}
            alt={`${title} – hotel exterior and rooms`}
            loading="lazy"
          />
        ) : (
          <div
            className="card-placeholder"
            role="img"
            aria-label={`No photo available for ${title}`}
          >
            No photo yet
          </div>
        )}

        {image_count > 1 && (
          <span className="photo-badge">
            {image_count} photos
          </span>
        )}
      </Link>

      <div className="card-body">
        <div className="card-top">
          <div>
            <h3 className="card-title">
              <Link to={`/hotels/${id}`}>{title}</Link>
            </h3>

            {star_class > 0 && (
              <span
                className="class-stars"
                aria-label={`${star_class} star hotel`}
              >
                {'★'.repeat(star_class)}
              </span>
            )}
          </div>

          {score && (
            <div
              className="score"
              title={`${review_count} guest reviews`}
            >
              <div className="score-text">
                <strong>{scoreLabel(score)}</strong>
                <span>
                  {review_count}{' '}
                  {review_count === 1 ? 'review' : 'reviews'}
                </span>
              </div>

              <span
                className="score-badge"
                aria-label={`Guest score ${score} out of 10`}
              >
                {score}
              </span>
            </div>
          )}
        </div>

        <p className="card-meta">
          {[
            city,
            property_type !== 'Hotel' && property_type,
            distance_km != null && `${distance_km} km from centre`
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {score ? (
          <p className="card-rating">
            <Stars value={avg_rating} />
            <span className="muted">{avg_rating} / 5</span>
          </p>
        ) : (
          <p className="card-rating">
            <span className="muted">No reviews yet</span>
          </p>
        )}

        {top_review && (
          <blockquote className="card-review">
            “{top_review.comment}
            {top_review.comment.length >= 140 ? '…' : ''}”
            <footer>
              — {top_review.name}, {top_review.rating}/5
            </footer>
          </blockquote>
        )}

        {amenities.length > 0 && (
          <ul className="amenity-tags" aria-label="Facilities">
            {amenities.slice(0, 3).map((a) => (
              <li key={a}>{a}</li>
            ))}

            {amenities.length > 3 && (
              <li>+{amenities.length - 3}</li>
            )}
          </ul>
        )}

        {free_cancellation && (
          <p className="free-cancel">✓ Free cancellation</p>
        )}

        <p className="card-desc">{description}</p>

        <div className="card-price">
          <strong>
            {formatPrice(multi ? total_price : price)}
          </strong>

          <span>
            {multi
              ? ` for ${stay.nights} night${stay.nights > 1 ? 's' : ''}${stay.rooms > 1 ? `, ${stay.rooms} rooms` : ''}`
              : ' / night'}
          </span>

          {multi && (
            <small className="muted">
              ({formatPrice(price)} / night)
            </small>
          )}
        </div>

        <Link
          to={`/hotels/${id}`}
          className="btn btn-primary btn-block"
        >
          View details
        </Link>

        {isAdmin && (
          <div className="card-actions">
            <Link
              to={`/hotels/${id}/edit`}
              className="btn btn-outline"
            >
              Edit
            </Link>

            <button
              type="button"
              className="btn btn-danger-outline"
              onClick={() => onDelete(hotel)}
              >
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}


const Stepper = ({ label, value, min, max, onChange }) => (
  <div className="stepper-row">
    <span>{label}</span>
    <div className="stepper">
      <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <strong aria-live="polite">{value}</strong>
      <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  </div>
);
export function SearchBar({ filters, cities = [], onSearch }) {
  const [v, setV] = useState({ destination: filters.destination, checkIn: filters.checkIn, checkOut: filters.checkOut, adults: filters.adults, children: filters.children, rooms: filters.rooms });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const boxRef = useRef(null);
  useEffect(() => {
    setV({ destination: filters.destination, checkIn: filters.checkIn, checkOut: filters.checkOut, adults: filters.adults, children: filters.children, rooms: filters.rooms });
  }, [filters.destination, filters.checkIn, filters.checkOut, filters.adults, filters.children, filters.rooms]);
  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const set = (patch) => { setV((x) => ({ ...x, ...patch })); setError(''); };
  const nextDay = (d) => { const t = new Date(d); t.setDate(t.getDate() + 1); return t.toISOString().slice(0, 10); };
  const onCheckIn = (d) => {
    set({ checkIn: d, checkOut: v.checkOut && v.checkOut <= d ? nextDay(d) : v.checkOut });
  };
  const submit = (e) => {
    e.preventDefault();
    if ((v.checkIn && !v.checkOut) || (!v.checkIn && v.checkOut)) return setError('Please choose both check-in and check-out dates.');
    if (v.checkIn && v.checkOut <= v.checkIn) return setError('Check-out must be after check-in.');
    setOpen(false);
    onSearch({ ...v, destination: v.destination.trim() });
  };
  const guestText = `${v.adults} adult${v.adults > 1 ? 's' : ''} · ${v.children} child${v.children === 1 ? '' : 'ren'} · ${v.rooms} room${v.rooms > 1 ? 's' : ''}`;
  return (
    <form className="searchbar" onSubmit={submit} role="search" aria-label="Search hotels" noValidate>
      <div className="sb-field">
        <label htmlFor="sb-dest">Destination</label>
        <input id="sb-dest" list="sb-cities" type="text" placeholder="City or hotel name" value={v.destination} onChange={(e) => set({ destination: e.target.value })} autoComplete="off" />
        <datalist id="sb-cities">{cities.map((c) => <option key={c.value} value={c.value} />)}</datalist>
      </div>
      <div className="sb-field">
        <label htmlFor="sb-in">Check-in</label>
        <input id="sb-in" type="date" min={minDate()} value={v.checkIn} onChange={(e) => onCheckIn(e.target.value)} />
      </div>
      <div className="sb-field">
        <label htmlFor="sb-out">Check-out</label>
        <input id="sb-out" type="date" min={v.checkIn ? nextDay(v.checkIn) : minDate()} value={v.checkOut} onChange={(e) => set({ checkOut: e.target.value })} />
      </div>
      <div className="sb-field sb-guests" ref={boxRef}>
        <label htmlFor="sb-guests">Guests &amp; rooms</label>
        <button id="sb-guests" type="button" className="sb-guest-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{guestText} <span aria-hidden="true">▾</span></button>
        {open && (
          <div className="guest-pop" role="dialog" aria-label="Guests and rooms">
            <Stepper label="Adults" value={v.adults} min={1} max={30} onChange={(n) => set({ adults: n })} />
            <Stepper label="Children" value={v.children} min={0} max={10} onChange={(n) => set({ children: n })} />
            <Stepper label="Rooms" value={v.rooms} min={1} max={10} onChange={(n) => set({ rooms: n })} />
            <button type="button" className="btn btn-outline btn-block" onClick={() => setOpen(false)}>Done</button>
          </div>
        )}
      </div>
      <button type="submit" className="btn btn-primary sb-submit">Search</button>
      {error && <p className="field-error sb-error" role="alert">{error}</p>}
    </form>
  );
}



const SCORES = [{ v: 9, label: 'Wonderful: 9+', key: 's9' }, { v: 8, label: 'Very good: 8+', key: 's8' }, { v: 7, label: 'Good: 7+', key: 's7' }, { v: 6, label: 'Pleasant: 6+', key: 's6' }];
const DISTANCES = [1, 3, 5, 10];

const toggle = (list, item) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

function Check({ id, label, count, checked, onChange }) {
  return (
    <label className="check" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} />
      <span className="check-label">{label}</span>
      {count != null && <span className="check-count">{count}</span>}
    </label>
  );
}
export function SearchFilter({ filters, facets, nights, onChange, onReset }) {
  const [min, setMin] = useState(filters.minPrice);
  const [max, setMax] = useState(filters.maxPrice);
  useEffect(() => { setMin(filters.minPrice); setMax(filters.maxPrice); }, [filters.minPrice, filters.maxPrice]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (String(min) !== String(filters.minPrice) || String(max) !== String(filters.maxPrice)) onChange({ minPrice: min, maxPrice: max });
    }, 400);
    return () => clearTimeout(t);
  }, [min, max]);
  const invalidRange = min !== '' && max !== '' && Number(min) > Number(max);
  const f = facets || {};
  const countOf = (list, value) => list?.find((x) => String(x.value) === String(value))?.count ?? 0;
  return (
    <aside className="filters" aria-label="Filters">
      <h2 className="filters-title">Filter by</h2>

      <fieldset className="filter-block">
        <legend className="filter-title">Review score</legend>
        {SCORES.map((s) => (
          <Check key={s.v} id={`score-${s.v}`} label={s.label} count={f.score?.[s.key]}
            checked={Number(filters.minScore) === s.v} onChange={() => onChange({ minScore: Number(filters.minScore) === s.v ? '' : s.v })} />
        ))}
        <p className="muted">Based on guest reviews</p>
      </fieldset>

<div className="filter-block">
  <span className="filter-title" id="price-label">
    Your budget {nights > 1 ? `(total for ${nights} nights)` : '(₹)'}
  </span>

  <div className="price-row" role="group" aria-labelledby="price-label">
    <input
      type="number"
      min="0"
      step="1"
      inputMode="numeric"
      className="input"
      placeholder="Min"
      aria-label="Minimum price"
      value={min}
      onKeyDown={(e) => {
        if (['-', '+', 'e', 'E', '.', ','].includes(e.key)) {
          e.preventDefault();
        }
      }}
      onChange={(e) => {
        const value = e.target.value;
        if (value === '' || /^\d+$/.test(value)) {
          setMin(value);
        }
      }}
    />

    <span aria-hidden="true">–</span>

    <input
      type="number"
      min="0"
      step="1"
      inputMode="numeric"
      className="input"
      placeholder="Max"
      aria-label="Maximum price"
      value={max}
      onKeyDown={(e) => {
        if (['-', '+', 'e', 'E', '.', ','].includes(e.key)) {
          e.preventDefault();
        }
      }}
      onChange={(e) => {
        const value = e.target.value;
        if (value === '' || /^\d+$/.test(value)) {
          setMax(value);
        }
      }}
    />
  </div>

  {invalidRange && (
    <p className="field-error">
      Minimum price is higher than maximum.
    </p>
  )}
</div>

      <fieldset className="filter-block">
        <legend className="filter-title">Star rating</legend>
        {[5, 4, 3, 2, 1].map((n) => (
          <Check key={n} id={`star-${n}`} label={`${n} star${n > 1 ? 's' : ''}`} count={countOf(f.stars, n)}
            checked={filters.stars.includes(n)} onChange={() => onChange({ stars: toggle(filters.stars, n) })} />
        ))}
      </fieldset>

      <fieldset className="filter-block">
        <legend className="filter-title">Property type</legend>
        {(f.propertyTypes || []).map((t) => (
          <Check key={t.value} id={`type-${t.value}`} label={t.value} count={t.count}
            checked={filters.types.includes(t.value)} onChange={() => onChange({ types: toggle(filters.types, t.value) })} />
        ))}
      </fieldset>

      <fieldset className="filter-block">
        <legend className="filter-title">Facilities</legend>
        {(f.amenities || []).map((a) => (
          <Check key={a.slug} id={`am-${a.slug}`} label={a.name} count={a.count}
            checked={filters.amenities.includes(a.slug)} onChange={() => onChange({ amenities: toggle(filters.amenities, a.slug) })} />
        ))}
      </fieldset>

      <fieldset className="filter-block">
        <legend className="filter-title">Booking options</legend>
        <Check id="free-cancel" label="Free cancellation" count={f.freeCancellation}
          checked={filters.freeCancellation} onChange={() => onChange({ freeCancellation: !filters.freeCancellation })} />
      </fieldset>

      <fieldset className="filter-block">
        <legend className="filter-title">Distance from centre</legend>
        {DISTANCES.map((d) => (
          <Check key={d} id={`dist-${d}`} label={`Less than ${d} km`} checked={Number(filters.maxDistance) === d}
            onChange={() => onChange({ maxDistance: Number(filters.maxDistance) === d ? '' : d })} />
        ))}
      </fieldset>

      <button type="button" className="btn btn-outline btn-block" onClick={onReset}>Clear all filters</button>
    </aside>
    
  );
}



const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 5;
const MAX_PHOTOS = 3;
const EMPTY = { title: '', description: '', latitude: '', longitude: '', price: '', city: '', star_class: '3', property_type: 'Hotel', max_guests: '2', total_rooms: '10', distance_km: '', free_cancellation: false };
const PROPERTY_TYPES = ['Hotel', 'Apartment', 'Resort', 'Guesthouse', 'Villa', 'Homestay'];
const AMENITIES = [['free-wifi', 'Free WiFi'], ['pool', 'Swimming pool'], ['parking', 'Free parking'], ['breakfast', 'Breakfast included'], ['ac', 'Air conditioning'], ['restaurant', 'Restaurant'], ['gym', 'Fitness centre'], ['spa', 'Spa'], ['airport', 'Airport shuttle']];
const validate = (v, photoCount) => {
  const e = {};
  if (photoCount < 1)
     e.images = 'Please add at least one hotel photo (2–3 recommended).';
  if (!v.title.trim())
     e.title = 'Hotel name is required.';
  else if (v.title.trim().length > 150)
     e.title = 'Hotel name must be 150 characters or fewer.';
  if (!v.description.trim())
     e.description = 'Description is required.';
  const num = (x) => String(x).trim() !== '' && Number.isFinite(Number(x));
  if (!num(v.latitude) || Math.abs(Number(v.latitude)) > 90) 
    e.latitude = 'Enter a latitude between -90 and 90 (or paste a map link above).';
  if (!num(v.longitude) || Math.abs(Number(v.longitude)) > 180)
    e.longitude = 'Enter a longitude between -180 and 180 (or paste a map link above).';
  if (!num(v.price) || Number(v.price) < 0) 
    e.price = 'Enter a valid price (0 or more).';
  if (!v.city.trim()) 
    e.city = 'City / destination is required.';
  if (!num(v.max_guests) || Number(v.max_guests) < 1 || Number(v.max_guests) > 20) 
    e.max_guests = 'Guests per room: 1 to 20.';
  if (!num(v.total_rooms) || Number(v.total_rooms) < 1) 
    e.total_rooms = 'Enter the number of rooms (1 or more).';
  if (v.distance_km !== '' && (!num(v.distance_km) || Number(v.distance_km) < 0)) 
    e.distance_km = 'Distance must be 0 or more.';
  return e;
};
export function HotelForm({ initial, mode = 'add', submitting, serverErrors, onSubmit, onCancel }) {
  const [values, setValues] = useState(EMPTY);
  const [existing, setExisting] = useState([]); 
  const [added, setAdded] = useState([]);       
  const [errors, setErrors] = useState({});
  const [geoMsg, setGeoMsg] = useState({ type: '', text: '' });
  const [amenities, setAmenities] = useState([]); 
  const [mapLink, setMapLink] = useState('');
  const [resolving, setResolving] = useState(false);
  const lastResolved = useRef('');
  const addedRef = useRef([]);
  addedRef.current = added;
  useEffect(() => {
    if (initial) {
      setValues({
        title: initial.title, description: initial.description, price: String(initial.price),
        latitude: String(initial.latitude), longitude: String(initial.longitude),
        city: initial.city || '', star_class: String(initial.star_class ?? ''), property_type: initial.property_type || 'Hotel',
        max_guests: String(initial.max_guests ?? 2), total_rooms: String(initial.total_rooms ?? 10),
        distance_km: initial.distance_km == null ? '' : String(initial.distance_km), free_cancellation: Boolean(initial.free_cancellation),
      });
      setAmenities((initial.amenities || []).map((a) => a.slug));
      setExisting((initial.images || []).filter((i) => i.id));
    }
  }, [initial]);
  useEffect(() => { if (serverErrors) setErrors((p) => ({ ...p, ...serverErrors })); }, [serverErrors]);
  useEffect(() => () => addedRef.current.forEach((a) => URL.revokeObjectURL(a.url)), []);
  const total = existing.length + added.length;
  const set = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: undefined }));
  };
  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) 
      return;
    const room = MAX_PHOTOS - total;
    const accepted = [];
    let problem = '';
    for (const f of files) {
      if (!TYPES.includes(f.type)) { 
        problem = 'Only JPG, PNG or WebP images are supported.';
         continue;
      }
      if (f.size > MAX_MB * 1024 * 1024) { 
        problem = `Each photo must be ${MAX_MB} MB or smaller.`; 
        continue; 
      }
      if (accepted.length >= room) { 
        problem = `A hotel can have at most ${MAX_PHOTOS} photos.`; 
        continue; 
      }
      accepted.push({ file: f, url: URL.createObjectURL(f) });
    }
    if (accepted.length) setAdded((a) => [...a, ...accepted]);
    setErrors((p) => ({ ...p, images: problem || undefined }));
  };
  const removeExisting = (id) => setExisting((x) => x.filter((p) => p.id !== id));
  const removeAdded = (url) => {
    URL.revokeObjectURL(url);
    setAdded((a) => a.filter((p) => p.url !== url));
  };
  const applyCoords = (c, text) => {
    setValues((v) => ({ ...v, latitude: String(c.latitude), longitude: String(c.longitude) }));
    setErrors((p) => ({ ...p, latitude: undefined, longitude: undefined }));
    setGeoMsg({ type: 'ok', text: `${text} Latitude ${c.latitude}, longitude ${c.longitude}.` });
  };
  const resolveLink = async (raw) => {
    const text = raw.trim();
    if (!text || text === lastResolved.current) 
      return;
    lastResolved.current = text;
    const local = parseCoordsFromText(text);
    if (local) 
      return applyCoords(local, 'Coordinates taken from the link.');
    if (!looksLikeUrl(text)) 
      return setGeoMsg({ type: 'error', text: 'Paste a Google Maps link (https://…) or coordinates like 13.0827, 80.2707.' });
    setResolving(true);
    setGeoMsg({ type: 'info', text: 'Reading the short link…' });
    try {
      applyCoords(await geoApi.resolve(text), 'Coordinates taken from the link.');
    } catch (err) {
      lastResolved.current = '';
      setGeoMsg({ type: 'error', text: err.message });
    } finally {
      setResolving(false);
    }
  };
  const useMyLocation = () => {
    if (!navigator.geolocation) return setGeoMsg({ type: 'error', text: 'Geolocation is not supported by this browser.' });
    setGeoMsg({ type: 'info', text: 'Finding your location…' });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => applyCoords({ latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) }, 'Filled from your current location.'),
      () => setGeoMsg({ type: 'error', text: 'Could not get your location. Paste a map link instead.' })
    );
  };
  const submit = (e) => {
    e.preventDefault();
    const found = validate(values, total);
    setErrors(found);
    if (Object.keys(found).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.append(k, String(v).trim()));
    fd.append('amenities', JSON.stringify(amenities));
    if (mode === 'edit') fd.append('keepImageIds', JSON.stringify(existing.map((p) => p.id)));
    added.forEach((a) => fd.append('images', a.file));
    onSubmit(fd);
  };
  const field = (name, label, props = {}) => (
    <div className="form-field">
      <label htmlFor={name}>{label}</label>
      <input id={name} className={`input ${errors[name] ? 'invalid' : ''}`} value={values[name]} onChange={set(name)} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-err` : undefined} {...props} />
      {errors[name] && <p id={`${name}-err`} className="field-error" role="alert">{errors[name]}</p>}
    </div>
  );
  const hasCoords = values.latitude !== '' && values.longitude !== '' && Number.isFinite(Number(values.latitude)) && Number.isFinite(Number(values.longitude));
  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="form-field">
        <span className="label" id="photos-label">Hotel photos <small>({total}/{MAX_PHOTOS}) – add 2 or 3, the first is the cover</small></span>
        <div className="photo-grid">
          {existing.map((p, i) => (
            <figure className="photo-tile" key={`e${p.id}`}>
              <img src={imageUrl(p.image_path)} alt={`Saved photo ${i + 1}`} />
              {i === 0 && <figcaption className="cover-tag">Cover</figcaption>}
              <button type="button" className="photo-remove" onClick={() => removeExisting(p.id)} aria-label={`Remove saved photo ${i + 1}`}>×</button>
            </figure>
          ))}
          {added.map((p, i) => (
            <figure className="photo-tile" key={p.url}>
              <img src={p.url} alt={`New photo ${i + 1}`} />
              {existing.length + i === 0 && <figcaption className="cover-tag">Cover</figcaption>}
              <button type="button" className="photo-remove" onClick={() => removeAdded(p.url)} aria-label={`Remove new photo ${i + 1}`}>×</button>
            </figure>
          ))}
          {total < MAX_PHOTOS && (
            <label className={`photo-add ${errors.images ? 'invalid' : ''}`} htmlFor="images">
              <span className="photo-add-plus" aria-hidden="true">+</span>
              <span>Add photo</span>
              <small>JPG, PNG, WebP · {MAX_MB} MB</small>
            </label>
          )}
        </div>
        <input id="images" type="file" multiple accept={TYPES.join(',')} className="sr-only" onChange={onFiles} aria-invalid={Boolean(errors.images)} aria-describedby="photos-label" />
        {errors.images && <p className="field-error" role="alert">{errors.images}</p>}
      </div>

      {field('title', 'Hotel name', { type: 'text', placeholder: 'e.g. Grand Palace Hotel', maxLength: 150 })}

      <div className="form-field">
        <label htmlFor="description">Description</label>
        <textarea id="description" rows="5" className={`input ${errors.description ? 'invalid' : ''}`} placeholder="Rooms, amenities, nearby places…" value={values.description} onChange={set('description')} aria-invalid={Boolean(errors.description)} />
        {errors.description && <p className="field-error" role="alert">{errors.description}</p>}
      </div>

      {field('price', 'Price per night (₹)', { type: 'number', min: 0, step: '0.01', inputMode: 'decimal', placeholder: '2500' })}

      <div className="form-grid">
        {field('city', 'City / destination', { type: 'text', placeholder: 'e.g. Chennai', maxLength: 100 })}
        <div className="form-field">
          <label htmlFor="property_type">Property type</label>
          <select id="property_type" className="input" value={values.property_type} onChange={set('property_type')}>
            {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="star_class">Star class</label>
          <select id="star_class" className="input" value={values.star_class} onChange={set('star_class')}>
            <option value="">Unrated</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>
        {field('distance_km', 'Distance from centre (km)', { type: 'number', min: 0, step: '0.1', placeholder: '2.5' })}
      </div>
      <div className="form-grid">
        {field('max_guests', 'Max guests per room', { type: 'number', min: 1, max: 20, placeholder: '2' })}
        {field('total_rooms', 'Total rooms available', { type: 'number', min: 1, placeholder: '10' })}
      </div>

      <fieldset className="form-field">
        <legend className="label">Facilities</legend>
        <div className="chips">
          {AMENITIES.map(([slug, name]) => (
            <button key={slug} type="button" className={`chip ${amenities.includes(slug) ? 'active' : ''}`} aria-pressed={amenities.includes(slug)}
              onClick={() => setAmenities((a) => (a.includes(slug) ? a.filter((x) => x !== slug) : [...a, slug]))}>{name}</button>
          ))}
        </div>
        <label className="check" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={values.free_cancellation} onChange={(e) => setValues((v) => ({ ...v, free_cancellation: e.target.checked }))} />
          <span className="check-label">Free cancellation</span>
        </label>
      </fieldset>

      <div className="form-field">
        <label htmlFor="mapLink">Map link <small>(Google Maps share link – coordinates are filled automatically)</small></label>
        <div className="link-row">
          <input id="mapLink" type="url" className="input" placeholder="https://maps.app.goo.gl/… or https://www.google.com/maps/place/…" value={mapLink}
            onChange={(e) => setMapLink(e.target.value)}
            onPaste={(e) => { const t = e.clipboardData.getData('text'); setTimeout(() => resolveLink(t), 0); }}
            onBlur={(e) => resolveLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolveLink(e.currentTarget.value); } }} />
          <button type="button" className="btn btn-outline btn-sm" disabled={resolving || !mapLink.trim()} onClick={() => { lastResolved.current = ''; resolveLink(mapLink); }}>
            {resolving ? 'Reading…' : 'Get coordinates'}
          </button>
        </div>
        {geoMsg.text && <p className={`geo-msg ${geoMsg.type}`} role="status">{geoMsg.text}</p>}
      </div>

      <div className="form-grid">
        {field('latitude', 'Latitude', { type: 'number', step: 'any', placeholder: '13.0827' })}
        {field('longitude', 'Longitude', { type: 'number', step: 'any', placeholder: '80.2707' })}
      </div>
      <div className="geo-row">
        <button type="button" className="btn btn-outline btn-sm" onClick={useMyLocation}>Use my current location</button>
        <small>You can still edit latitude / longitude by hand.</small>
      </div>

      {hasCoords && (
        <div className="form-field">
          <span className="label">Location preview</span>
          <HotelMap lat={values.latitude} lng={values.longitude} title={values.title || 'Hotel location'} height={240} />
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add hotel'}
        </button>
      </div>
    </form>
  );
}



const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export function Reviews({ hotelId }) {
  const isAdmin = Boolean(useSelector((s) => s.auth.admin));
  const [data, setData] = useState({ reviews: [], count: 0, average: null });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [values, setValues] = useState({ reviewer_name: '', rating: 0, comment: '' });
  const [errors, setErrors] = useState({});
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      setData(await reviewApi.list(hotelId));
      setLoadError('');
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);
  useEffect(() => { setLoading(true); load(); }, [load]);

  const set = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    setErrors((p) => ({ ...p, [name]: undefined }));
  };
  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!values.reviewer_name.trim()) found.reviewer_name = 'Please enter your name.';
    if (!values.rating) found.rating = 'Please choose a rating.';
    if (!values.comment.trim()) found.comment = 'Please write a short review.';
    setErrors(found);
    setFormMsg({ type: '', text: '' });
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const res = await reviewApi.create(hotelId, { ...values, reviewer_name: values.reviewer_name.trim(), comment: values.comment.trim() });
      setValues({ reviewer_name: '', rating: 0, comment: '' });
      setFormMsg({ type: 'ok', text: res.message });
      await load();
    } catch (err) {
      setErrors(err.errors || {});
      setFormMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await reviewApi.remove(hotelId, id);
      await load();
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message });
    }
  };
  return (
    <section className="reviews" aria-labelledby="reviews-title">
      <div className="reviews-head">
        <h2 id="reviews-title">Guest reviews</h2>
        {data.count > 0 && (
          <p className="reviews-summary">
            <strong>{data.average}</strong> <Stars value={data.average} size="1.15rem" /> <span className="muted">({data.count} {data.count === 1 ? 'review' : 'reviews'})</span>
          </p>
        )}
      </div>
      <div className="reviews-grid">
        <form className="panel review-form" onSubmit={submit} noValidate>
          <h3>Write a review</h3>
          {formMsg.text && <p className={formMsg.type === 'ok' ? 'notice-ok' : 'alert'} role="status">{formMsg.text}</p>}
          <div className="form-field">
            <label htmlFor="reviewer_name">Your name</label>
            <input id="reviewer_name" className={`input ${errors.reviewer_name ? 'invalid' : ''}`} maxLength={100} value={values.reviewer_name} onChange={set('reviewer_name')} aria-invalid={Boolean(errors.reviewer_name)} />
            {errors.reviewer_name && <p className="field-error" role="alert">{errors.reviewer_name}</p>}
          </div>
          <div className="form-field">
            <span className="label">Rating</span>
            <StarPicker value={values.rating} error={errors.rating} onChange={(n) => { setValues((v) => ({ ...v, rating: n })); setErrors((p) => ({ ...p, rating: undefined })); }} />
            {errors.rating && <p className="field-error" role="alert">{errors.rating}</p>}
          </div>
          <div className="form-field">
            <label htmlFor="comment">Your review</label>
            <textarea id="comment" rows="4" maxLength={1000} className={`input ${errors.comment ? 'invalid' : ''}`} value={values.comment} onChange={set('comment')} placeholder="What did you like? Anything to improve?" aria-invalid={Boolean(errors.comment)} />
            {errors.comment && <p className="field-error" role="alert">{errors.comment}</p>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Posting…' : 'Post review'}</button>
        </form>

        <div className="review-list" aria-live="polite">
          {loading && <p className="muted">Loading reviews…</p>}
          {loadError && <p className="alert" role="alert">{loadError}</p>}
          {!loading && !loadError && !data.reviews.length && <div className="state-box"><p>No reviews yet. Be the first to share your stay!</p></div>}
          {data.reviews.map((r) => (
            <article className="review" key={r.id}>
              <header>
                <div>
                  <strong>{r.reviewer_name}</strong>
                  <time className="muted" dateTime={r.created_at}> · {fmtDate(r.created_at)}</time>
                </div>
                <Stars value={r.rating} />
              </header>
              <p>{r.comment}</p>
              {isAdmin && <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => remove(r.id)}>Delete review</button>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

