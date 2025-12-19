# HelpX MVP - Project Context

## Project Overview
HelpX is a local services marketplace MVP that connects service providers with customers. It's a full-stack application built with FastAPI (backend) and React (frontend), using PostgreSQL with PostGIS for geospatial data.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL 15 with PostGIS extension
- **ORM**: SQLAlchemy
- **Authentication**: JWT tokens (python-jose)
- **Password Hashing**: Passlib with bcrypt
- **Geospatial**: GeoAlchemy2, Shapely
- **Testing**: Pytest, HTTPX
- **Other**: Alembic (migrations), Pydantic (validation)

### Frontend
- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.2
- **Routing**: React Router DOM 7.9.6
- **Styling**: Tailwind CSS 4.1.17
- **HTTP Client**: Axios 1.13.2
- **Maps**: Leaflet 1.9.4, React Leaflet 5.0.0
- **Charts**: Recharts 3.5.0
- **Validation**: Zod

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database Image**: postgis/postgis:15-3.4

## Project Structure

```
helpx-mvp/
├── backend/
│   ├── app/
│   │   ├── api/          # API route handlers
│   │   │   ├── admin.py
│   │   │   ├── auth.py
│   │   │   ├── bookings.py
│   │   │   ├── provider.py
│   │   │   ├── services.py
│   │   │   └── user.py
│   │   ├── core/         # Configuration
│   │   │   └── config.py
│   │   ├── db/           # Database setup
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   ├── models.py     # SQLAlchemy models
│   │   ├── schemas.py    # Pydantic schemas
│   │   ├── crud.py       # Database operations
│   │   ├── main.py       # FastAPI app entry point
│   │   └── seed.py       # Database seeding
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   ├── contexts/     # React contexts (AuthContext)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Page components
│   │   ├── utils/        # Utility functions
│   │   ├── api.js        # API client configuration
│   │   ├── App.jsx       # Main app component
│   │   └── main.jsx      # Entry point
│   ├── package.json
│   └── vite.config.js
├── schema_supabase_ready.sql  # Database schema dump
├── docker-compose.yml
└── CONTEXT.md            # This file
```

## Database Schema

### Core Tables

1. **users**
   - `id` (PK), `email` (unique), `hashed_password`, `name`, `role` (customer/provider/admin)
   - `is_active`, `created_at`

2. **providers**
   - `id` (PK), `user_id` (FK → users), `business_name`, `bio`
   - `rating` (numeric 2,1), `verified`, `created_at`

3. **services**
   - `id` (PK), `provider_id` (FK → providers), `title`, `description`
   - `category`, `price`, `location` (PostGIS Geography Point)
   - `flagged`, `flag_reason`, `approved`, `created_at`
   - Indexed: `category`, `location` (GIST)

4. **bookings**
   - `id` (PK), `service_id` (FK → services), `user_id` (FK → users)
   - `provider_id` (FK → providers), `when_at`, `notes`
   - `status` (pending/accepted/declined/cancelled/completed)
   - `price` (snapshot at booking time), `created_at`

5. **addresses**
   - `id` (PK), `user_id` (FK → users), `label`, `line1`, `line2`
   - `city`, `pincode`, `lat`, `lon`, `created_at`

6. **provider_payout_settings**
   - `id` (PK), `provider_id` (FK → providers, unique)
   - `upi_id`, `bank_acc_no`, `bank_ifsc`
   - `created_at`, `updated_at`

7. **reports**
   - `id` (PK), `reporter_id` (FK → users)
   - `report_type` (service/user/provider/booking)
   - `target_id`, `reason`, `status` (pending/resolved/dismissed)
   - `admin_notes`, `created_at`, `resolved_at`

## API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login (returns JWT)
- `GET /auth/me` - Get current user info

### Services (`/services`)
- `GET /services` - List services (with filters: category, location, radius)
- `GET /services/{id}` - Get service details
- `POST /services` - Create service (provider only)
- `PUT /services/{id}` - Update service (provider only)
- `DELETE /services/{id}` - Delete service (provider only)

### Bookings (`/bookings`)
- `GET /bookings` - List bookings (filtered by user role)
- `POST /bookings` - Create booking
- `PUT /bookings/{id}` - Update booking status
- `GET /bookings/{id}` - Get booking details

### User (`/user`)
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `GET /user/addresses` - List user addresses
- `POST /user/addresses` - Add address
- `PUT /user/addresses/{id}` - Update address
- `DELETE /user/addresses/{id}` - Delete address

### Provider (`/provider`)
- `GET /provider/profile` - Get provider profile
- `PUT /provider/profile` - Update provider profile
- `GET /provider/payout-settings` - Get payout settings
- `PUT /provider/payout-settings` - Update payout settings

### Admin (`/admin`)
- `GET /admin/stats` - Dashboard statistics
- `GET /admin/services` - List all services (with flags)
- `PUT /admin/services/{id}/approve` - Approve service
- `PUT /admin/services/{id}/flag` - Flag service
- `GET /admin/reports` - List reports
- `PUT /admin/reports/{id}/resolve` - Resolve report
- `GET /admin/users` - List users
- `PUT /admin/users/{id}/toggle-active` - Toggle user active status

## Frontend Pages & Routes

- `/` - Services listing page (public)
- `/login` - Login page
- `/register` - Registration page
- `/service/:id` - Service detail page (public)
- `/create` - Create service page (provider only)
- `/dashboard` - Provider dashboard (provider only)
- `/user/dashboard` - User dashboard (authenticated users)
- `/admin/dashboard` - Admin dashboard (admin only)

## Key Features

1. **User Roles**
   - Customer: Browse and book services
   - Provider: Create and manage services, receive bookings
   - Admin: Manage platform, approve/flag services, handle reports

2. **Service Management**
   - Geospatial search (PostGIS)
   - Category filtering
   - Service approval/flagging system
   - Provider verification

3. **Booking System**
   - Create bookings with date/time
   - Status management (pending → accepted/declined → completed)
   - Price snapshot at booking time

4. **Address Management**
   - Multiple addresses per user
   - Geocoding support (lat/lon)

5. **Reporting System**
   - Report services, users, providers, or bookings
   - Admin review and resolution

6. **Payout Settings**
   - UPI ID and bank account details for providers

## Algorithm: Location-Based Provider Matching

- **Filtering**: PostGIS `ST_DWithin` on `Geography(Point,4326)` + category match; providers must be `is_active` and `is_verified`; self-assignments blocked.
- **Distance**: `ST_Distance` on geography returns meters; distances normalised by the max observed candidate distance to stay scale-free.
- **Scoring**: `0.6*normalized_distance + 0.25*inverse_rating + 0.15*workload_penalty`, where `inverse_rating = 1 - rating/5` and `workload_penalty = active_bookings/MAX_ALLOWED_BOOKINGS (20)`. Lower is better.
- **Ranking**: Deterministic sort ascending by score; default top 5 returned with distance (km), rating, workload, and score.
- **Complexity**: SQL pre-filter; Python scoring `O(n log n)` (n = candidates). Designed to be explainable and ML-pluggable later.
- For full details see `docs/location_matching.md`.

## Authentication & Authorization

- JWT-based authentication
- Token stored in localStorage (frontend)
- Role-based access control (RBAC)
- Protected routes via `ProtectedRoute` component
- Super admin email configured in `config.py` (default: admin@helpx.com)

## Environment Variables

### Backend
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration (default: 1440 = 24 hours)
- `SUPER_ADMIN_EMAIL` - Admin email for admin access

### Frontend
- API base URL configured in `src/api.js` (default: `http://localhost:8000`)

## Development Setup

1. **Start database and backend**:
   ```bash
   docker-compose up -d
   ```

2. **Backend runs on**: `http://localhost:8000`
   - API docs: `http://localhost:8000/docs`

3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   - Frontend runs on: `http://localhost:5173`

## Database Setup

- Database: `helpxdb`
- User: `helpx`
- Password: `helpxpass`
- Port: `5432`
- PostGIS extension enabled for geospatial queries

## Testing

- Backend tests: `pytest` (in `backend/tests/`)
- Example test file: `test_bookings.py`

## Key Files Reference

- **Backend Entry**: `backend/app/main.py`
- **Frontend Entry**: `frontend/src/main.jsx`
- **Database Models**: `backend/app/models.py`
- **API Schemas**: `backend/app/schemas.py`
- **Auth Context**: `frontend/src/contexts/AuthContext.jsx`
- **API Client**: `frontend/src/api.js`
- **Database Schema**: `schema_supabase_ready.sql`

## Common Patterns

1. **API Calls**: Use axios instance from `src/api.js` with interceptors for auth
2. **Protected Routes**: Wrap components with `RequireUser`, `RequireProvider`, or `RequireAdmin`
3. **Geospatial Queries**: Use PostGIS functions for location-based searches
4. **Error Handling**: Toast notifications via `src/utils/toast.js`
5. **Styling**: Tailwind CSS with custom gradient classes (`gradient-primary`, `gradient-hero`)

## Notes

- CORS configured for `localhost:5173` (Vite default)
- Database tables auto-created on startup (via `Base.metadata.create_all`)
- JWT tokens expire after 24 hours by default
- Admin access restricted to super admin email
- Services are approved by default but can be flagged
- Location data stored as PostGIS Geography Point (SRID 4326)
