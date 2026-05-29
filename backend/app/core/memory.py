from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Optional


Difficulty = Literal["Easy", "Medium", "Hard"]


@dataclass
class Evaluation:
    score: float  # 0-10
    strengths: list[str]
    weaknesses: list[str]
    missing_concepts: list[str]
    summary: str


@dataclass
class QAItem:
    question_number: int
    question: str
    answer: str
    evaluation: Evaluation
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class InterviewState:
    session_id: str
    role: str
    difficulty: Difficulty
    n_questions: int
    candidate_name: str = ""
    items: list[QAItem] = field(default_factory=list)

    def add_item(self, item: QAItem) -> None:
        self.items.append(item)

    def average_score(self) -> float:
        if not self.items:
            return 0.0
        return sum(i.evaluation.score for i in self.items) / len(self.items)

    def recent_strengths(self, limit: int = 5) -> list[str]:
        out: list[str] = []
        for it in reversed(self.items[-limit:]):
            out.extend(it.evaluation.strengths)
        return _dedupe_keep_order(out)[:limit]

    def recent_weaknesses(self, limit: int = 5) -> list[str]:
        out: list[str] = []
        for it in reversed(self.items[-limit:]):
            out.extend(it.evaluation.weaknesses)
            out.extend(it.evaluation.missing_concepts)
        return _dedupe_keep_order(out)[:limit]

    def last_score(self) -> Optional[float]:
        if not self.items:
            return None
        return self.items[-1].evaluation.score


def _dedupe_keep_order(xs: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in xs:
        k = x.strip()
        if not k or k in seen:
            continue
        seen.add(k)
        out.append(k)
    return out

