from __future__ import annotations

import json
import os
import uuid
from dataclasses import dataclass
from typing import Any, Literal, Optional

from langfuse import Langfuse

from app.core.interview import FinalReport
from app.core.memory import InterviewState


DATA_FILE = "interviews.json"

Status = Literal["in_progress", "completed"]


def load_data():
    if not os.path.exists(DATA_FILE):
        return {}

    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {}


def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f)


@dataclass
class ActiveInterview:
    interview_id: str
    trace_id: str
    state: InterviewState
    langfuse: Langfuse
    llm_client: Any
    model: str
    current_question: str
    current_question_number: int
    status: Status = "in_progress"
    final_report: Optional[FinalReport] = None


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, ActiveInterview] = {}

    def create(self, session: ActiveInterview) -> ActiveInterview:
        self._sessions[session.interview_id] = session

        db = load_data()

        db[session.interview_id] = {
            "interview_id": session.interview_id,
            "current_question": session.current_question,
            "current_question_number": session.current_question_number,
            "status": session.status,
        }

        save_data(db)

        return session

    def get(self, interview_id: str) -> Optional[ActiveInterview]:
        return self._sessions.get(interview_id)

    def update(self, session: ActiveInterview) -> None:
        self._sessions[session.interview_id] = session

        db = load_data()

        db[session.interview_id] = {
            "interview_id": session.interview_id,
            "current_question": session.current_question,
            "current_question_number": session.current_question_number,
            "status": session.status,
        }

        save_data(db)

    def delete(self, interview_id: str) -> None:
        self._sessions.pop(interview_id, None)

        db = load_data()

        if interview_id in db:
            del db[interview_id]

        save_data(db)


store = SessionStore()


def new_interview_id() -> str:
    return uuid.uuid4().hex