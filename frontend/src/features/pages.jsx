import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  login, imageUrl, fetchHotels, fetchHotel, fetchFacets, createHotel, updateHotel, deleteHotel,
  setFilters, setPage, resetFilters, clearCurrent,
} from '../store';
import { Modal, Pagination, ImageSlider, HotelMap, Stars } from './layout';
import { HotelCard, HotelForm, Reviews, SearchBar, SearchFilter, formatPrice, scoreLabel } from './hotels';


export function HotelList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { items, total, totalPages, loading, error, filters, facets, stay } = useSelector((s) => s.hotels);
  const isAdmin = Boolean(useSelector((s) => s.auth.admin));
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice || '');

  useEffect(() => { dispatch(fetchHotels(filters)); }, [dispatch, filters]);
  useEffect(() => { dispatch(fetchFacets()); }, [dispatch]);

  useEffect(() => { if (location.state?.notice) navigate('.', { replace: true, state: null }); }, []); // eslint-disable-line

  const closeNotice = useCallback(() => setNotice(''), []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(closeNotice, 2500);
    return () => clearTimeout(t);
  }, [notice, closeNotice]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await dispatch(deleteHotel(toDelete.id)).unwrap();
      setToDelete(null);
      setNotice('Hotel deleted successfully!');
      if (items.length === 1 && filters.page > 1) dispatch(setPage(filters.page - 1));
      else dispatch(fetchHotels(filters));
    } catch (e) {
      setToDelete(null);
      setNotice(e?.message || 'Could not delete the hotel.');
    } finally {
      setDeleting(false);
    }
  };
  const filtered = Boolean(filters.destination || filters.checkIn || filters.minPrice !== '' || filters.maxPrice !== '' || filters.minScore !== ''
    || filters.stars.length || filters.types.length || filters.amenities.length || filters.maxDistance !== '' || filters.freeCancellation);
  return (
    <>
      <Helmet>
        <title>Hotels{filters.page > 1 ? ` – page ${filters.page}` : ''} | Let's Calm</title>
        <meta name="description" content="Search hotels by destination, dates and guests. Filter by review score, price, stars and facilities." />
        <meta property="og:title" content="Let's Calm" />
        <meta property="og:description" content="Search, filter and manage hotel listings." />
      </Helmet>

      <section className="hero">
        <div className="container">
          <h1>Find your next stay!!</h1>
        </div>
      </section>

      <div className="container"><SearchBar filters={filters} cities={facets?.cities} onSearch={(v) => dispatch(setFilters(v))} /></div>

      <main className="container layout">
        <SearchFilter filters={filters} facets={facets} nights={stay.nights} onChange={(f) => dispatch(setFilters(f))} onReset={() => dispatch(resetFilters())} />

        <section aria-live="polite" className="results">
          <div className="results-head">
            <h2>{loading && !items.length ? 'Loading hotels…' : `${total} ${total === 1 ? 'hotel' : 'hotels'} found`}</h2>
            <div className="results-tools">
              <label htmlFor="sort" className="sr-only">Sort by</label>
              <select id="sort" className="input sort-select" value={filters.sort} onChange={(e) => dispatch(setFilters({ sort: e.target.value }))}>
                <option value="top">Sort: Our top picks</option>
                <option value="rating">Review score (high to low)</option>
                <option value="price_asc">Price (low to high)</option>
                <option value="price_desc">Price (high to low)</option>
                <option value="newest">Newest first</option>
              </select>
              {isAdmin && <Link to="/hotels/new" className="btn btn-primary btn-sm">+ Add hotel</Link>}
            </div>
          </div>

          {error && (
            <div className="state-box"><p>{error}</p><button className="btn btn-primary" onClick={() => dispatch(fetchHotels(filters))}>Try again</button></div>
          )}

          {!error && !loading && !items.length && (
            <div className="state-box">
              <h3>{filtered ? 'No hotels match your filters' : 'No hotels yet'}</h3>
              <p>{filtered ? 'Try different dates, fewer guests, or remove some filters.' : (isAdmin ? 'Add your first hotel to get started.' : 'Please check back soon.')}</p>
              {filtered ? <button className="btn btn-outline" onClick={() => dispatch(resetFilters())}>Clear filters</button> : isAdmin && <Link to="/hotels/new" className="btn btn-primary">Add hotel</Link>}
            </div>
          )}

          <div className={`grid ${loading ? 'is-loading' : ''}`}>
            {items.map((h) => <HotelCard key={h.id} hotel={h} stay={stay} onDelete={setToDelete} />)}
          </div>

          <Pagination page={filters.page} totalPages={totalPages} onChange={(p) => { dispatch(setPage(p)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </section>
      </main>

      <Modal open={Boolean(toDelete)} onClose={() => !deleting && setToDelete(null)} title="Delete this hotel?">
        <p>“{toDelete?.title}” will be permanently removed, including its photos and reviews.</p>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</button>
          <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
        </div>
      </Modal>

      <Modal open={Boolean(notice)} onClose={closeNotice} title={notice} tone="success">
        <button className="btn btn-primary" onClick={closeNotice}>OK</button>
      </Modal>
    </>
  );
}

export function HotelDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: h, loading, error } = useSelector((s) => s.hotels);
  const isAdmin = Boolean(useSelector((s) => s.auth.admin));

  useEffect(() => {
    dispatch(fetchHotel(id));
    return () => dispatch(clearCurrent());
  }, [dispatch, id]);

  if (loading || (!h && !error)) return <main className="container state-box"><p>Loading hotel…</p></main>;
  if (error || !h) {
    return (
      <main className="container state-box">
        <Helmet><title>Hotel not found | Let's Calm</title></Helmet>
        <h1>Hotel not found</h1><p>{error}</p>
        <Link className="btn btn-primary" to="/">Back to hotels</Link>
      </main>
    );
  }

  const summary = h.description.length > 155 ? `${h.description.slice(0, 152)}…` : h.description;
  const photos = (h.images || []).map((i) => imageUrl(i.image_path));
  const osm = `https://www.openstreetmap.org/?mlat=${h.latitude}&mlon=${h.longitude}#map=15/${h.latitude}/${h.longitude}`;
  const gmaps = `https://www.google.com/maps?q=${h.latitude},${h.longitude}`;

  return (
    <main className="container">
      <Helmet>
        <title>{h.title} – {formatPrice(h.price)} per night | Let's Calm</title>
        <meta name="description" content={summary} />
        <meta property="og:title" content={h.title} />
        <meta property="og:description" content={summary} />
        {photos[0] && <meta property="og:image" content={photos[0]} />}
      </Helmet>

      <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/">Hotels</Link> / <span>{h.title}</span></nav>

      <div className="details-head">
        <div>
          <h1 className="page-title">{h.title}</h1>
          <p className="card-meta">{[h.city, h.property_type, h.star_class > 0 && '★'.repeat(h.star_class), h.distance_km != null && `${h.distance_km} km from centre`].filter(Boolean).join(' · ')}</p>
          {h.review_count > 0 && (
            <p className="details-rating"><span className="score-badge">{(h.avg_rating * 2).toFixed(1)}</span> <strong>{scoreLabel(h.avg_rating * 2)}</strong> <Stars value={h.avg_rating} size="1.1rem" /> <span className="muted">({h.review_count} {h.review_count === 1 ? 'review' : 'reviews'})</span></p>
          )}
        </div>
        {isAdmin && <Link to={`/hotels/${h.id}/edit`} className="btn btn-outline">Edit hotel</Link>}
      </div>

      <div className="details">
        <div className="details-main">
          <ImageSlider images={photos} alt={h.title} />
          <h2>About this hotel</h2>
          <p className="details-desc">{h.description}</p>
          {h.amenities?.length > 0 && (
            <>
              <h2>Facilities</h2>
              <ul className="amenity-tags big">{h.amenities.map((a) => <li key={a.slug}>{a.name}</li>)}</ul>
            </>
          )}
          {h.free_cancellation && <p className="free-cancel">✓ Free cancellation</p>}
        </div>

        <aside className="details-side">
          <div className="panel price-panel">
            <p className="muted">Price from</p>
            <p className="price-big">{formatPrice(h.price)}</p>
            <p className="muted">per night</p>
          </div>
          <div className="panel">
            <h2 className="side-title">Location</h2>
            <dl className="coords">
              <div><dt>Latitude</dt><dd>{h.latitude}</dd></div>
              <div><dt>Longitude</dt><dd>{h.longitude}</dd></div>
            </dl>
            <a href={gmaps} target="_blank" rel="noreferrer" className="btn btn-outline btn-block">Open in Google Maps</a>
            <a href={osm} target="_blank" rel="noreferrer" className="btn btn-ghost-dark btn-block">Open in OpenStreetMap</a>
          </div>
        </aside>
      </div>

      <section className="map-section" aria-labelledby="map-title">
        <h2 id="map-title">On the map</h2>
        <HotelMap lat={h.latitude} lng={h.longitude} title={h.title} />
      </section>

      <Reviews hotelId={h.id} />
    </main>
  );
}




export function HotelFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, loading, saving, error } = useSelector((s) => s.hotels);
  const [serverErrors, setServerErrors] = useState(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (isEdit) dispatch(fetchHotel(id));
    return () => dispatch(clearCurrent());
  }, [dispatch, id, isEdit]);

  const handleSubmit = async (formData) => {
    setServerErrors(null);
    setSubmitError('');
    const action = isEdit ? updateHotel({ id, formData }) : createHotel(formData);
    try {
      const res = await dispatch(action).unwrap();
      navigate('/', { state: { notice: res.message } });
    } catch (e) {
      setServerErrors(e.errors || null);
      setSubmitError(e.message || 'Could not save the hotel.');
    }
  };

  const title = isEdit ? 'Edit hotel' : 'Add a new hotel';

  return (
    <main className="container narrow">
      <Helmet>
        <title>{title} | Let's Calm</title>
        <meta name="description" content={isEdit ? 'Update hotel details, price, location and image.' : 'Add a hotel with photos, price and map location.'} />
        <meta name="robots" content="noindex" />
      </Helmet>

      <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/">Hotels</Link> / <span>{title}</span></nav>
      <h1 className="page-title">{title}</h1>

      {isEdit && loading && <p className="state-box">Loading hotel…</p>}
      {isEdit && error && <div className="state-box"><p>{error}</p><Link className="btn btn-primary" to="/">Back to hotels</Link></div>}

      {(!isEdit || current) && (
        <div className="panel">
          {submitError && <p className="alert" role="alert">{submitError}</p>}
          <HotelForm mode={isEdit ? 'edit' : 'add'} initial={isEdit ? current : null} submitting={saving} serverErrors={serverErrors} onSubmit={handleSubmit} onCancel={() => navigate(-1)} />
        </div>
      )}
    </main>
  );
}



export function AdminLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, loggingIn } = useSelector((s) => s.auth);
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const redirectTo = location.state?.from || '/';

  if (admin) return <Navigate to={redirectTo} replace />;

  const set = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    setErrors((p) => ({ ...p, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!values.email.trim()) found.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) found.email = 'Enter a valid email address.';
    if (!values.password) found.password = 'Password is required.';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    try {
      await dispatch(login({ email: values.email.trim(), password: values.password })).unwrap();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setErrors(err.errors || {});
      setFormError(err.message || 'Login failed.');
    }
  };

  return (
    <main className="container narrow auth-wrap">
      <Helmet>
        <title>Admin login | Let's Calm</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="page-title">Admin login</h1>
      <div className="panel">
        <p className="muted auth-hint">Only administrators can add, edit or delete hotels.</p>
        {formError && <p className="alert" role="alert">{formError}</p>}
        <form className="form" onSubmit={submit} noValidate>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" className={`input ${errors.email ? 'invalid' : ''}`} value={values.email} onChange={set('email')} aria-invalid={Boolean(errors.email)} />
            {errors.email && <p className="field-error" role="alert">{errors.email}</p>}
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" className={`input ${errors.password ? 'invalid' : ''}`} value={values.password} onChange={set('password')} aria-invalid={Boolean(errors.password)} />
            {errors.password && <p className="field-error" role="alert">{errors.password}</p>}
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loggingIn}>{loggingIn ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </main>
  );
}

