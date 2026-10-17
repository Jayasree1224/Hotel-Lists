import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
const BASE = import.meta.env.VITE_API_URL || '';
export const TOKEN_KEY = 'lc_admin_token';
export const imageUrl = (p) => (!p ? '' : p.startsWith('http') ? p : `${BASE}${p}`);
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } };

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, { ...options, headers });
  } catch {
    throw Object.assign(new Error('Cannot reach the server. Please check your connection.'), { errors: null });
  }
  let body = null;
  try { body = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/auth/login')) window.dispatchEvent(new Event('auth:expired'));
    throw Object.assign(new Error(body?.message || 'Something went wrong.'), { errors: body?.errors || null, status: res.status });
  }
  return body;
}

const json = (method, data) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const hotelApi = {
  list: (params) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === '' || v == null || v === false) return;
      if (Array.isArray(v)) { if (v.length) q.set(k, v.join(',')); return; }
      q.set(k, v === true ? '1' : v);
    });
    return request(`/hotels?${q.toString()}`);
  },
  facets: () => request('/hotels/facets'),
  get: (id) => request(`/hotels/${id}`),
  create: (formData) => request('/hotels', { method: 'POST', body: formData }),
  update: (id, formData) => request(`/hotels/${id}`, { method: 'PUT', body: formData }),
  remove: (id) => request(`/hotels/${id}`, { method: 'DELETE' }),
};

export const authApi = {
  login: (email, password) => request('/auth/login', json('POST', { email, password })),
  me: () => request('/auth/me'),
};

export const reviewApi = {
  list: (hotelId) => request(`/hotels/${hotelId}/reviews`),
  create: (hotelId, data) => request(`/hotels/${hotelId}/reviews`, json('POST', data)),
  remove: (hotelId, reviewId) => request(`/hotels/${hotelId}/reviews/${reviewId}`, { method: 'DELETE' }),
};

export const geoApi = {
  resolve: (url) => request('/geo/resolve', json('POST', { url })),
};
  


const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';
const result = (lat, lng) => {
  const la = Number(lat), ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180
    ? { latitude: la.toFixed(6), longitude: ln.toFixed(6) } : null;
};

export function parseCoordsFromText(input) {
  if (!input) return null;
  let text = String(input).trim();
  try { text = decodeURIComponent(text); } catch { /* keep */ }
  let m;
  if ((m = text.match(new RegExp(`!3d${NUM}!4d${NUM}`)))) return result(m[1], m[2]);
  if ((m = text.match(new RegExp(`[?&]mlat=${NUM}.*?[&]mlon=${NUM}`)))) return result(m[1], m[2]);
  if ((m = text.match(new RegExp(`@${NUM},\\s*${NUM}`)))) return result(m[1], m[2]);
  if ((m = text.match(new RegExp(`[?&](?:q|ll|query|center|destination|daddr|saddr)=\\s*\\+?${NUM}\\s*,\\s*${NUM}`)))) return result(m[1], m[2]);
  if ((m = text.match(new RegExp(`#map=\\d+/${NUM}/${NUM}`)))) return result(m[1], m[2]);
  if ((m = text.match(new RegExp(`^\\s*${NUM}\\s*[,\\s]\\s*${NUM}\\s*$`)))) return result(m[1], m[2]);
  return null;
}

export const looksLikeUrl = (t) => /^https?:\/\//i.test(String(t).trim());





export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const data = await authApi.login(email, password);
    setToken(data.token);
    return data.admin;
  } catch (e) {
    return rejectWithValue({ message: e.message, errors: e.errors });
  }
});

export const restoreSession = createAsyncThunk('auth/restore', async (_, { rejectWithValue }) => {
  try {
    return (await authApi.me()).admin;
  } catch (e) {
    setToken(null);
    return rejectWithValue(e.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { admin: null, checking: Boolean(getToken()), loggingIn: false },
  reducers: {
    logout(state) { setToken(null); state.admin = null; state.checking = false; },
  },
  extraReducers: (b) => {
    b.addCase(login.pending, (s) => { s.loggingIn = true; })
      .addCase(login.fulfilled, (s, { payload }) => { s.loggingIn = false; s.admin = payload; })
      .addCase(login.rejected, (s) => { s.loggingIn = false; })
      .addCase(restoreSession.fulfilled, (s, { payload }) => { s.checking = false; s.admin = payload; })
      .addCase(restoreSession.rejected, (s) => { s.checking = false; s.admin = null; });
  },
});

export const { logout } = authSlice.actions;



const fail = (err, { rejectWithValue }) => rejectWithValue({ message: err.message, errors: err.errors });

export const fetchHotels = createAsyncThunk('hotels/fetchAll', (params, t) => hotelApi.list(params).catch((e) => fail(e, t)));
export const fetchHotel = createAsyncThunk('hotels/fetchOne', (id, t) => hotelApi.get(id).catch((e) => fail(e, t)));
export const createHotel = createAsyncThunk('hotels/create', (fd, t) => hotelApi.create(fd).catch((e) => fail(e, t)));
export const updateHotel = createAsyncThunk('hotels/update', ({ id, formData }, t) => hotelApi.update(id, formData).catch((e) => fail(e, t)));
export const deleteHotel = createAsyncThunk('hotels/delete', (id, t) => hotelApi.remove(id).catch((e) => fail(e, t)));
export const fetchFacets = createAsyncThunk('hotels/facets', (_, t) => hotelApi.facets().catch((e) => fail(e, t)));
export const PAGE_SIZE = 6;
const today = () => new Date().toISOString().slice(0, 10);
export const DEFAULT_FILTERS = {
  destination: '', checkIn: '', checkOut: '', adults: 2, children: 0, rooms: 1,   // search bar
  minPrice: '', maxPrice: '', minScore: '', stars: [], types: [], amenities: [],  // sidebar
  maxDistance: '', freeCancellation: false, sort: 'top', page: 1, limit: PAGE_SIZE,
};
export const minDate = today;
const initialState = {
  items: [],
  total: 0,
  totalPages: 1,
  current: null,
  loading: false,
  saving: false,
  error: null,
  facets: null,
  stay: { nights: 1, rooms: 1, guests: 2 }, 
  filters: DEFAULT_FILTERS,
};
const hotelSlice = createSlice({
  name: 'hotels',
  initialState,
  reducers: {
    setFilters(state, { payload }) {
      state.filters = { ...state.filters, page: 1, ...payload };
    },
    setPage(state, { payload }) {
      state.filters.page = payload;
    },
    resetFilters(state) {
      state.filters = DEFAULT_FILTERS;
    },
    clearCurrent(state) {
      state.current = null;
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchHotels.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchHotels.fulfilled, (s, { payload }) => {
        s.loading = false;
        s.items = payload.data;
        s.total = payload.total;
        s.totalPages = payload.totalPages;
        s.stay = { nights: payload.nights, rooms: payload.rooms, guests: payload.guests };
      })
      .addCase(fetchFacets.fulfilled, (s, { payload }) => { s.facets = payload; })
      .addCase(fetchHotels.rejected, (s, { payload }) => { s.loading = false; s.error = payload?.message || 'Failed to load hotels.'; })

      .addCase(fetchHotel.pending, (s) => { s.loading = true; s.error = null; s.current = null; })
      .addCase(fetchHotel.fulfilled, (s, { payload }) => { s.loading = false; s.current = payload; })
      .addCase(fetchHotel.rejected, (s, { payload }) => { s.loading = false; s.error = payload?.message || 'Failed to load hotel.'; })

      .addCase(createHotel.pending, (s) => { s.saving = true; })
      .addCase(createHotel.fulfilled, (s) => { s.saving = false; })
      .addCase(createHotel.rejected, (s) => { s.saving = false; })
      .addCase(updateHotel.pending, (s) => { s.saving = true; })
      .addCase(updateHotel.fulfilled, (s) => { s.saving = false; })
      .addCase(updateHotel.rejected, (s) => { s.saving = false; })

      .addCase(deleteHotel.fulfilled, (s, { payload }) => {
        s.items = s.items.filter((h) => h.id !== payload.id);
        s.total = Math.max(s.total - 1, 0);
      });
  },
});

export const { setFilters, setPage, resetFilters, clearCurrent } = hotelSlice.actions;
   


const store = configureStore({
  reducer: { hotels: hotelSlice.reducer, auth: authSlice.reducer },
});

export default store;
