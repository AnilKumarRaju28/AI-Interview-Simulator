# AI Interview Simulator

Technical interview simulator with **Groq LLMs**, **Langfuse** observability, and a **React** web UI.

## Project structure

```
AI Interview/
├── backend/                 # Python FastAPI + interview engine
│   ├── app/
│   │   ├── api.py           # FastAPI REST API
│   │   ├── main.py          # Terminal CLI entrypoint
│   │   ├── config.py        # Env loading
│   │   ├── constants.py
│   │   ├── prompts.py
│   │   ├── core/            # Interview logic, LLM, Langfuse
│   │   └── store/           # In-memory session store
│   ├── seed_prompts.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # React (Vite) web UI
│   ├── src/
│   └── package.json
└── README.md
```

## Setup

### 1) Backend

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

Create env file (either location works):

```bash
copy backend\.env.example backend\.env
# or keep .env at project root
```

Fill in `GROQ_API_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`.

Seed Langfuse prompts:

```bash
cd backend
python seed_prompts.py
```

### 2) Frontend

```bash
cd frontend
npm install
```

## Run (Web UI)

**Terminal 1 — Backend** (from `backend/`):

```bash
cd backend
..\.venv\Scripts\uvicorn app.api:app --reload --port 8000
```

**Terminal 2 — Frontend**:

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**

## Run (Terminal CLI)

```bash
cd backend
..\.venv\Scripts\python -m app.main
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/roles` | List roles & difficulties |
| POST | `/api/interviews` | Start interview |
| POST | `/api/interviews/{id}/answers` | Submit answer |
| GET | `/api/interviews/{id}/report` | Full feedback report |

## Langfuse tracing

- **Sessions**: sequential IDs (`1`, `2`, …) via `propagate_attributes(session_id=...)`
- **Traces**: `interview_session` with question/evaluation/report generations
- **Scores**: per-question `answer_score` + final `overall_score`

## Architecture documentation

Full architecture, code flow, data flow, validation, and timer behavior: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**
