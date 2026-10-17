import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { Navbar, Footer, ProtectedRoute } from './features/layout';
import {
HotelList,
HotelDetails,
HotelFormPage,
AdminLogin,
} from './features/pages';

import { restoreSession, logout, getToken } from './store';

function NotFound() {
return ( <main className="container state-box"> <Helmet> <title>Page not found | Let's Calm</title> </Helmet>
  <h1>Page not found</h1>
  <p>The page you are looking for does not exist.</p>
  <Link className="btn btn-primary" to="/">
    Back to hotels
  </Link>
</main>
);
}
export default function App() {
const dispatch = useDispatch();
const navigate = useNavigate();
useEffect(() => {
if (getToken()) {
dispatch(restoreSession());
}}, [dispatch]);

useEffect(() => {
const onExpired = () => {
dispatch(logout());
navigate('/admin/login', { replace: true });
};
window.addEventListener('auth:expired', onExpired);

return () => {
  window.removeEventListener('auth:expired', onExpired);
};
}, [dispatch, navigate]);
return (
<>
<a href="#main" className="skip-link">
Skip to content </a>
  <Navbar />
  <div id="main">
    <Routes>
      <Route path="/" element={<HotelList />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/hotels/new"
        element={
          <ProtectedRoute>
            <HotelFormPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hotels/:id"
        element={<HotelDetails />}/>

      <Route
        path="/hotels/:id/edit"
        element={
          <ProtectedRoute>
            <HotelFormPage />
          </ProtectedRoute>
        }/>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </div>

  <Footer />
</>
);
}
