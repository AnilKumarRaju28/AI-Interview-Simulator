# Frontend — AI Interview Simulator

React + Vite web UI for the interview simulator.

## Run

```bash
npm install
npm run dev
```

App runs at **http://localhost:5173** and proxies `/api` to the backend at `http://127.0.0.1:8000`.

## Build

```bash
npm run build
npm run preview
```

## Environment

Optional override for API base URL:

```bash
# .env.local
VITE_API_URL=http://127.0.0.1:8000
```

Leave unset to use the Vite dev proxy (recommended for local dev).
