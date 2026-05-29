from __future__ import annotations

import os

from app.config import load_env
from app.core.groq_client import make_groq_client
from app.core.interview import run_interview
from app.core.langfuse_utils import make_langfuse, new_session_id
from app.core.memory import InterviewState
from app.core.interview_service import build_welcome_message


from app.core.utils import read_choice, read_int


def _read_name() -> str:
    while True:
        name = input("Enter your name: ").strip()
        if name:
            return name
        print("Name cannot be empty. Please try again.")


def main() -> None:
    load_env()

    # Setup
    candidate_name = _read_name()
    role = _choose_role()
    difficulty = _choose_difficulty()
    n_questions = read_int("Number of questions (1-20) [5]: ", min_value=1, max_value=20, default=5)

    session_id = os.getenv("SESSION_ID", "").strip() or new_session_id()

    langfuse = make_langfuse()
    llm_client, groq_cfg = make_groq_client()

    state = InterviewState(
        session_id=session_id,
        role=role,
        difficulty=difficulty,  # type: ignore[arg-type]
        n_questions=n_questions,
        candidate_name=candidate_name,
    )

    print("")
    print("AI Interview Simulator")
    print(build_welcome_message(candidate_name, role))
    print(f"Session: {session_id}")
    print(f"Role: {role} | Difficulty: {difficulty} | Questions: {n_questions}")
    print(f"Model: {groq_cfg.model}")
    print("")

    report = run_interview(langfuse=langfuse, llm_client=llm_client, model=groq_cfg.model, state=state)

    print("")
    print("=== Per-Question Feedback ===")
    for item in state.items:
        ev = item.evaluation
        print("")
        print(f"Q{item.question_number}. {item.question}")
        print(f"Score: {ev.score:.1f}/10")
        if ev.summary:
            print(f"Feedback: {ev.summary}")
        if ev.strengths:
            print("Strengths:")
            for s in ev.strengths[:5]:
                print(f"- {s}")
        if ev.weaknesses:
            print("Weaknesses:")
            for w in ev.weaknesses[:5]:
                print(f"- {w}")
        if ev.missing_concepts:
            print("Missing concepts:")
            for m in ev.missing_concepts[:5]:
                print(f"- {m}")

    print("")
    print("=== Final Report ===")
    print(f"Overall Score: {report.overall_score:.2f}/10")
    print("")
    if report.raw_text:
        print(report.raw_text)
    else:
        print("Strengths:")
        for s in report.strengths:
            print(f"- {s}")
        print("")
        print("Weaknesses:")
        for w in report.weaknesses:
            print(f"- {w}")
        print("")
        print("Recommendation:")
        print(report.recommendation)

    # Ensure telemetry is flushed if supported
    try:
        langfuse.flush()
    except Exception:
        pass


def _choose_role() -> str:
    roles = [
        "Python Developer",
        "AI Engineer",
        "Backend Developer",
        "Frontend Developer",
        "Full Stack Developer",
        "DevOps Engineer",
        "Data Engineer",
        "Mobile Developer",
        "QA / SDET",
        "Other (type your own)",
    ]
    print("Choose Role:")
    for i, r in enumerate(roles, start=1):
        print(f"{i}. {r}")
    selected = read_choice("> ", roles, default_index=0)
    if selected == "Other (type your own)":
        custom = input("Enter role name: ").strip()
        return custom or "Other"
    return selected


def _choose_difficulty() -> str:
    diffs = ["Easy", "Medium", "Hard"]
    print("")
    print("Choose Difficulty:")
    for i, d in enumerate(diffs, start=1):
        print(f"{i}. {d}")
    return read_choice("> ", diffs, default_index=1)


if __name__ == "__main__":
    main()

