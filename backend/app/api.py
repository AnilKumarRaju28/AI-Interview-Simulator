from __future__ import annotations

import os
from typing import Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import load_env
from app.constants import DIFFICULTIES, ROLES
from app.core.interview_service import get_report, start_interview, submit_answer

load_env()

app = FastAPI(title="AI Interview Simulator API", version="1.0.0")

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StartInterviewRequest(BaseModel):
    candidate_name: str = Field(..., min_length=1, max_length=100)
    role: str
    difficulty: Literal["Easy", "Medium", "Hard"] = "Medium"
    n_questions: int = Field(default=5, ge=1, le=20)


class SubmitAnswerRequest(BaseModel):
    answer: str


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/roles")
def list_roles() -> dict[str, list[str]]:
    return {"roles": ROLES, "difficulties": DIFFICULTIES}


@app.post("/api/interviews")
def create_interview(body: StartInterviewRequest) -> dict:
    try:
        return start_interview(
            role=body.role.strip(),
            difficulty=body.difficulty,
            n_questions=body.n_questions,
            candidate_name=body.candidate_name.strip(),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/interviews/{interview_id}/answers")
def post_answer(interview_id: str, body: SubmitAnswerRequest) -> dict:
    try:
        return submit_answer(interview_id=interview_id, answer=body.answer)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/api/interviews/{interview_id}/report")
def fetch_report(interview_id: str) -> dict:
    try:
        return get_report(interview_id=interview_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
