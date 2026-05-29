from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Literal, Optional

from langfuse import Langfuse

from app.core.interview import FinalReport
from app.core.memory import InterviewState


Status = Literal["in_progress", "completed"]


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
        return session

    def get(self, interview_id: str) -> Optional[ActiveInterview]:
        return self._sessions.get(interview_id)

    def delete(self, interview_id: str) -> None:
        self._sessions.pop(interview_id, None)


store = SessionStore()


def new_interview_id() -> str:
    return uuid.uuid4().hex
