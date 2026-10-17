import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { logout } from '../store';


export function Logo({ light }) {
  return (
    <span className={`logo ${light ? 'logo-light' : ''}`}>
      <img src="/favicon.svg" alt="" width="30" height="30" />
      <span>Let's Calm</span>
    </span>
  );
}
export function Navbar() {
  const { admin } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" aria-label="Let's Calm home"><Logo light /></Link>
        <nav aria-label="Main">
          <NavLink to="/" end className="nav-link">Hotels</NavLink>
          {admin ? (
            <>
              <Link to="/hotels/new" className="btn btn-accent btn-sm">+ Add hotel</Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { dispatch(logout()); navigate('/'); }}>
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/admin/login" className="nav-link">Admin login</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}



export function Footer() {
  const [activeSection, setActiveSection] = useState('');

  const policies = {
    'Terms & Conditions': [
      'By using Let’s Calm, you agree to follow the website terms and applicable policies.',
      'Hotel prices, facilities and availability may change. Please verify booking details before confirming your reservation.',
      'Users must provide accurate information when making bookings.',
      'Bookings are subject to room availability and the selected property’s conditions.'
    ],
    'Privacy Policy': [
      'We may collect account details and booking information necessary to provide our services.',
      'Personal information should be protected and used only for legitimate service-related purposes.',
      'Information sharing must follow applicable privacy laws and the website’s actual practices.'
    ],
    'Cancellation Policy': [
      'Cancellation eligibility depends on the selected booking conditions.',
      'Free cancellation applies only when explicitly offered within the specified cancellation period.',
      'Changes to reservations depend on availability and the applicable property policy.'
    ],
    'Refund Policy': [
      'Refund eligibility depends on the booking terms, cancellation conditions and applicable law.',
      'Approved refunds are processed according to the payment provider’s procedures.',
      'The time required for a refund to appear may vary by bank or payment provider.'
    ]
  };

  const linkStyle = {
    display: 'block',
    color: '#d0dedb',
    textDecoration: 'none',
    fontSize: '14px',
    lineHeight: '1.8',
    marginBottom: '9px'
  };

  const headingStyle = {
    color: '#ffc247',
    fontSize: '16px',
    fontWeight: '700',
    margin: '0 0 20px',
    whiteSpace: 'nowrap'
  };

  return (
    <>
      <footer
        style={{
          width: '100%',
          background: '#061a17',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          marginTop: '40px',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1250px',
            margin: '0 auto',
            padding: '42px 30px 35px',
            boxSizing: 'border-box',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1.25fr 1.5fr',
            columnGap: '40px',
            rowGap: '30px',
            alignItems: 'start'
          }}
          className="lets-calm-footer-grid"
        >
          <div>
            <h2
              style={{
                fontSize: '25px',
                margin: '0 0 18px',
                color: '#ffffff'
              }}
            >
              Let's Calm
            </h2>

            <p
              style={{
                color: '#d0dedb',
                fontSize: '14px',
                lineHeight: '1.9',
                margin: '0 0 16px'
              }}
            >
              Discover comfortable stays, explore beautiful
              destinations, and find the perfect hotel for
              your next journey.
            </p>

            <p
              style={{
                color: '#ffc247',
                fontSize: '14px',
                fontWeight: 'bold',
                lineHeight: '1.7',
                margin: 0
              }}
            >
              Feel at home, wherever you go!
            </p>
          </div>

          
          <div>
            <h3 style={headingStyle}>Quick Links</h3>

            <a href="/" style={linkStyle}>Home</a>
            <a href="/" style={linkStyle}>Explore Hotels</a>
            <a href="/admin/login" style={linkStyle}>Admin Login</a>
          </div>

          <div>
            <h3 style={headingStyle}>Customer Support</h3>

            <a
              href="mailto:support@letscalm.com"
              style={linkStyle}
            >
              Contact Us
            </a>

            <a
              href="mailto:support@letscalm.com?subject=Help%20Request"
              style={linkStyle}
            >
              Help & Support
            </a>
          </div>

          <div>
            <h3 style={headingStyle}>Legal Information</h3>

            {Object.keys(policies).map((name) => (
              <button
                key={name}
                onClick={() => {
                  setActiveSection(name);
                  setTimeout(() => {
                    document
                      .getElementById('lets-calm-legal')
                      ?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                      });
                  }, 50);
                }}
                style={{
                  ...linkStyle,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit'
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid #29413d',
            padding: '18px 25px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}
        >
          <p
            style={{
              color: '#bdceca',
              fontSize: '13px',
              lineHeight: '1.8',
              margin: 0
            }}
          >
            © {new Date().getFullYear()} Let's Calm.
            All rights reserved.
            <br />
            Made for comfortable journeys and memorable stays.
          </p>
        </div>
      </footer>

      {activeSection && (
        <section
          id="lets-calm-legal"
          style={{
            maxWidth: '1000px',
            margin: '30px auto',
            padding: '30px',
            boxSizing: 'border-box',
            background: '#ffffff',
            border: '1px solid #e1e8e5',
            borderRadius: '10px',
            color: '#24332f',
            lineHeight: '1.8',
            scrollMarginTop: '20px'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '15px'
            }}
          >
            <h2 style={{ color: '#1689a5', margin: 0 }}>
              {activeSection}
            </h2>

            <button
              onClick={() => setActiveSection('')}
              style={{
                background: '#1689a5',
                color: '#ffffff',
                border: 'none',
                padding: '9px 15px',
                borderRadius: '6px',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              Close ✕
            </button>
          </div>

          <div style={{ marginTop: '22px' }}>
            {policies[activeSection].map((text, index) => (
              <p key={index} style={{ marginBottom: '16px' }}>
                <strong>{index + 1}. </strong>
                {text}
              </p>
            ))}
          </div>
        </section>
      )}

      <style>{`
        @media (max-width: 900px) {
          .lets-calm-footer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            column-gap: 30px !important;
          }
        }

        @media (max-width: 520px) {
          .lets-calm-footer-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            padding: 30px 22px !important;
            row-gap: 28px !important;
          }
        }
      `}</style>
    </>
  );
}



export function ProtectedRoute({ children }) {
  const { admin, checking } = useSelector((s) => s.auth);
  const location = useLocation();
  if (checking) return <main className="container state-box"><p>Checking your session…</p></main>;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return children;
}



export function Modal({ open, onClose, title, children, tone = 'default' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal modal-${tone}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon" aria-hidden="true">{tone === 'success' ? '✓' : '!'}</div>
        <h2 id="modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}




const pageList = (page, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
};
export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="page-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button>
      {pageList(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="page-gap" aria-hidden="true">…</span>
        ) : (
          <button key={p} type="button" className={`page-btn ${p === page ? 'active' : ''}`} aria-current={p === page ? 'page' : undefined} aria-label={`Page ${p}`} onClick={() => onChange(p)}>
            {p}
          </button>
        )
      )}
      <button type="button" className="page-btn" disabled={page === totalPages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  );
}



export function Stars({ value = 0, size = '1rem' }) {
  const pct = Math.max(0, Math.min(5, Number(value) || 0)) / 5 * 100;
  return (
    <span className="stars" style={{ fontSize: size }} role="img" aria-label={`${Number(value) || 0} out of 5 stars`}>
      <span className="stars-back" aria-hidden="true">★★★★★</span>
      <span className="stars-front" aria-hidden="true" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}
export function StarPicker({ value, onChange, error }) {
  return (
    <div role="radiogroup" aria-label="Your rating" className={`star-picker ${error ? 'invalid' : ''}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={`star-btn ${n <= value ? 'on' : ''}`} onClick={() => onChange(n)}>★</button>
      ))}
    </div>
  );
}



export function ImageSlider({ images, alt }) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const start = useRef(null);
  const width = useRef(1);
  const count = images.length;
  const go = (i) => setIndex(Math.max(0, Math.min(count - 1, i)));

  const onDown = (e) => {
    if (count < 2) return;
    start.current = e.clientX;
    width.current = e.currentTarget.getBoundingClientRect().width || 1;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (start.current == null) return;
    let dx = e.clientX - start.current;
    if ((index === 0 && dx > 0) || (index === count - 1 && dx < 0)) dx /= 3; // resistance at the ends
    setDrag(dx);
  };
  const onUp = () => {
    if (start.current == null) return;
    if (Math.abs(drag) > width.current * 0.15) go(index + (drag < 0 ? 1 : -1));
    start.current = null;
    setDrag(0);
  };
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') go(index - 1);
    if (e.key === 'ArrowRight') go(index + 1);
  };

  if (!count) return <div className="details-img card-placeholder" role="img" aria-label={`No photo available for ${alt}`}>No photo yet</div>;

  return (
    <div className="slider" role="region" aria-roledescription="carousel" aria-label={`${alt} photos`} tabIndex={0} onKeyDown={onKey}>
      <div className="slider-viewport" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp}>
        <div className="slider-track" style={{ transform: `translateX(calc(${-index * 100}% + ${drag}px))`, transition: start.current == null ? 'transform .35s ease' : 'none' }}>
          {images.map((src, i) => (
            <div className="slider-slide" key={src + i} role="group" aria-roledescription="slide" aria-label={`Photo ${i + 1} of ${count}`}>
              <img src={src} alt={`${alt} – photo ${i + 1}`} draggable="false" loading={i === 0 ? 'eager' : 'lazy'} />
            </div>
          ))}
        </div>
      </div>
      {count > 1 && (
        <>
          <button type="button" className="slider-btn prev" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous photo">‹</button>
          <button type="button" className="slider-btn next" onClick={() => go(index + 1)} disabled={index === count - 1} aria-label="Next photo">›</button>
          <div className="slider-dots">
            {images.map((_, i) => (
              <button key={i} type="button" className={`dot ${i === index ? 'active' : ''}`} onClick={() => go(i)} aria-label={`Go to photo ${i + 1}`} aria-current={i === index} />
            ))}
          </div>
          <span className="slider-count" aria-hidden="true">{index + 1} / {count}</span>
        </>
      )}
    </div>
  );
}



const pin = L.divIcon({
  className: 'map-pin-wrap',
  html: '<span class="map-pin"></span>',
  iconSize: [34, 42],
  iconAnchor: [17, 40],
  popupAnchor: [0, -38],
});
const TILE_SERVERS = [
  {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  },
];
function MapSync({ position }) {
  const map = useMap();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) first.current = false;
    else map.setView(position, map.getZoom());
  }, [map, position[0], position[1]]); 

  useEffect(() => {
    const el = map.getContainer();
    const fix = () => map.invalidateSize();
    const t1 = setTimeout(fix, 100);
    const t2 = setTimeout(fix, 600);
    let ro;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(fix); ro.observe(el); }
    window.addEventListener('resize', fix);
    return () => { clearTimeout(t1); clearTimeout(t2); ro?.disconnect(); window.removeEventListener('resize', fix); };
  }, [map]);

  return null;
}
export function HotelMap({ lat, lng, title, height = 380 }) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  const [server, setServer] = useState(0);
  const [failed, setFailed] = useState(false);
  const errors = useRef(0);

  const bad = lat === '' || lng === '' || lat == null || lng == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180;
  if (bad) return <p className="muted">Map will appear once valid coordinates are available.</p>;

  const position = [latitude, longitude];
  const tiles = TILE_SERVERS[server];
  const gmaps = `https://www.google.com/maps?q=${latitude},${longitude}`;

  const onTileError = () => {
    errors.current += 1;
    if (errors.current < 4) return;
    errors.current = 0;
    if (server < TILE_SERVERS.length - 1) setServer(server + 1);
    else setFailed(true);
  };
  return (
    <div className="map-wrap">
      <MapContainer center={position} zoom={15} scrollWheelZoom={false} className="map" style={{ height, width: '100%' }} aria-label={`Map showing the location of ${title}`}>
        <MapSync position={position} />
        <TileLayer
          key={server}
          url={tiles.url}
          attribution={tiles.attribution}
          subdomains={tiles.subdomains || 'abc'}
          maxZoom={tiles.maxZoom}
          crossOrigin=""
          referrerPolicy="origin"
          eventHandlers={{ tileerror: onTileError, tileload: () => { errors.current = 0; setFailed(false); } }}
        />
        <Marker position={position} icon={pin}>
          <Popup>{title}</Popup>
        </Marker>
      </MapContainer>
      {failed && (
        <p className="alert map-alert" role="alert">
          Map tiles could not be loaded (check your internet connection). <a href={gmaps} target="_blank" rel="noreferrer">Open in Google Maps</a>
        </p>
      )}
    </div>
  );
}

