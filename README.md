# Let's Calm – Hotel Management

React + Redux + Leaflet frontend, Node/Express + PostgreSQL backend.

## What's new
- **Admin login** (JWT). Only admins can add / edit / delete hotels and delete reviews. Visitors can browse, search, filter and post reviews.
- **2–3 photos per hotel** shown as a swipeable slider (drag / swipe, arrows, dots, keyboard).
- **Reviews & star ratings** on every hotel (rating also shown on cards).
- **Map link → coordinates**: paste a Google Maps link and latitude / longitude fill in automatically (short `maps.app.goo.gl` links are resolved by the server). Fields stay editable.
- **Map display fix**: auto-fallback tile server, resize/re-centre handling, clear error message.

## 1. Database (PostgreSQL – your existing `hotels` database)
Nothing is dropped; your hotels and their images are kept.

    cd hotel-management
    psql -U postgres -d hotels -f database/migration.sql

(or `cd backend && npm run db:init` which runs the same file). Safe to run more than once.

## 2. Backend
    cd backend
    npm install
    # check .env (DB_* values, JWT_SECRET)
    npm run create-admin        # creates admin@letscalm.com / Admin@12345 (change in .env or pass args)
    npm run dev                 # http://localhost:5000

Custom admin:  `node scripts/createAdmin.js you@mail.com YourStrongPass`

## 3. Frontend
    cd frontend
    npm install
    npm run dev                 # http://localhost:5173

Admin login page: http://localhost:5173/admin/login

## Notes
- Existing hotels keep their single image as photo #1. Log in → Edit → add up to 2 more photos.
- Optional demo reviews: `psql -U postgres -d hotels -f database/seed_reviews.sql`
- Change the default admin password and `JWT_SECRET` before deploying.
