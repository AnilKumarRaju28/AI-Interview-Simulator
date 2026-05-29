# Backend — AI Interview Simulator

Python FastAPI backend with Groq LLM integration and Langfuse observability.

## Run API

From this directory:

```bash
..\.venv\Scripts\uvicorn app.api:app --reload --port 8000
```

## Run terminal CLI

```bash
..\.venv\Scripts\python -m app.main
```

## Seed Langfuse prompts

```bash
..\.venv\Scripts\python seed_prompts.py
```

## Structure

```
backend/
├── app/
│   ├── api.py              # FastAPI app
│   ├── main.py             # Terminal CLI
│   ├── config.py           # Env paths
│   ├── constants.py        # Roles & difficulties
│   ├── prompts.py          # Langfuse prompt names
│   ├── core/
│   │   ├── interview.py    # Core workflow + terminal runner
│   │   ├── interview_service.py  # Web step-based API logic
│   │   ├── evaluator.py
│   │   ├── memory.py
│   │   ├── groq_client.py
│   │   ├── langfuse_utils.py
│   │   └── utils.py
│   └── store/
│       └── session_store.py
├── seed_prompts.py
└── requirements.txt
```
