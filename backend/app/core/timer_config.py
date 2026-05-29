from __future__ import annotations

SECONDS_PER_QUESTION: dict[str, int] = {
    "Easy": 5 * 60,
    "Medium": 8 * 60,
    "Hard": 10 * 60,
}


def get_timer_config(difficulty: str, n_questions: int) -> dict[str, int]:
    per_q = SECONDS_PER_QUESTION.get(difficulty, SECONDS_PER_QUESTION["Medium"])
    n = max(1, n_questions)
    return {
        "per_question_seconds": per_q,
        "total_seconds": per_q * n,
    }
