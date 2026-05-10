# TravelLoop

TravelLoop is a full-stack travel planning app for building multi-city itineraries, tracking budgets, managing packing checklists, saving trip notes, and sharing trips publicly.

## Features

- Signup and login with PBKDF2-hashed passwords
- Trip dashboard with create and delete
- Multi-stop itinerary builder with add/remove stops and activities
- Read-only itinerary view (timeline layout)
- Budget tracking with browser-locale currency formatting
- Packing checklist with categories and progress tracking
- Trip notes / journal
- Discovery page — browse curated destinations and activity ideas
- Share trips via a public link (read-only shared view)
- Responsive UI for desktop and mobile

## Tech Stack

- **Frontend:** React 18, Vite, React Router v6
- **Backend:** Node.js, Express, SQLite (via sqlite3)

## How to Run Locally

You need two terminals — one for the backend, one for the frontend.

### 1. Backend

```bash
cd backend
npm install
```

Copy the example env file:
```bash
copy .env.example .env
```

Start the server:
```bash
npm run dev
```

The backend runs on `http://localhost:4000`. The SQLite database is created automatically at `backend/data/traveloop.db` on first start.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
```

Copy the example env file:
```bash
copy .env.example .env
```

Start the dev server:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

> The Vite dev server proxies all `/api` requests to `http://localhost:4000`, so no CORS issues during development.

## Environment Variables

**Backend** (`backend/.env`):
```
PORT=4000
CORS_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
DB_PATH=./data/traveloop.db
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL=/api
```

## App Flow

1. Sign up or log in at `/`
2. Dashboard shows all your trips — create or delete from here
3. Click a trip to open the **Itinerary Builder** — add stops and activities, share the trip, or navigate to Budget / Checklist / Notes / Discover
4. **View Itinerary** shows a clean read-only timeline of all stops and activities
5. **Discover** lets you browse curated destinations and activity ideas
6. **Share** generates a public link — anyone with the link can view the trip at `/share/:code`

## Deployment

Deploy `backend/` to any Node host (Render, Railway, Fly.io) and `frontend/` to Vercel or Netlify.

Before building the frontend for production, set:
```
VITE_API_URL=https://your-backend-url.com/api
```

Set backend env vars:
```
PORT=4000
CORS_ORIGIN=https://your-frontend-url.com
DB_PATH=/var/data/traveloop.db
```

Build the frontend:
```bash
cd frontend
npm run build
```

Start the backend in production:
```bash
cd backend
npm start
```
