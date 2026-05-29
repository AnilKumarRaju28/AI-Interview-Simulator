from __future__ import annotations

from typing import Any, Optional

from langfuse import Langfuse, propagate_attributes

from app.core.evaluator import evaluate_answer
from app.core.groq_client import make_groq_client
from app.core.interview import FinalReport, generate_final_report, generate_question
from app.core.langfuse_utils import make_langfuse, new_session_id
from app.core.memory import InterviewState, QAItem
from app.core.timer_config import get_timer_config
from app.store.session_store import ActiveInterview, new_interview_id, store


def evaluation_to_dict(ev: Any) -> dict[str, Any]:
    return {
        "score": ev.score,
        "strengths": ev.strengths,
        "weaknesses": ev.weaknesses,
        "missing_concepts": ev.missing_concepts,
        "summary": ev.summary,
    }


def qa_item_to_dict(item: QAItem) -> dict[str, Any]:
    return {
        "question_number": item.question_number,
        "question": item.question,
        "answer": item.answer,
        "evaluation": evaluation_to_dict(item.evaluation),
    }


def final_report_to_dict(report: FinalReport) -> dict[str, Any]:
    return {
        "overall_score": report.overall_score,
        "strengths": report.strengths,
        "weaknesses": report.weaknesses,
        "improvements": report.improvements,
        "recommendation": report.recommendation,
        "raw_text": report.raw_text,
    }


def build_welcome_message(name: str, role: str) -> str:
    return f"Hello {name}, welcome to your {role} interview round. Best of luck!"


def start_interview(
    *,
    role: str,
    difficulty: str,
    n_questions: int,
    candidate_name: str,
    session_id: Optional[str] = None,
) -> dict[str, Any]:
    langfuse = make_langfuse()
    llm_client, groq_cfg = make_groq_client()
    sid = session_id or new_session_id()
    trace_id = langfuse.create_trace_id(seed=sid)
    trace_context = {"trace_id": trace_id}

    name = candidate_name.strip()
    if not name:
        raise ValueError("Candidate name cannot be empty")

    state = InterviewState(
        session_id=sid,
        role=role,
        difficulty=difficulty,  # type: ignore[arg-type]
        n_questions=n_questions,
        candidate_name=name,
    )

    with propagate_attributes(session_id=sid):
        with langfuse.start_as_current_observation(
            trace_context=trace_context,
            as_type="span",
            name="interview_session",
            metadata={
                "role": role,
                "difficulty": difficulty,
                "n_questions": n_questions,
                "session_id": sid,
                "candidate_name": name,
                "tags": ["web", "ai-interview", role, difficulty],
            },
        ):
            question, _ = generate_question(
                langfuse=langfuse,
                llm_client=llm_client,
                model=groq_cfg.model,
                state=state,
                question_number=1,
                trace_context=trace_context,
            )

    interview_id = new_interview_id()
    active = ActiveInterview(
        interview_id=interview_id,
        trace_id=trace_id,
        state=state,
        langfuse=langfuse,
        llm_client=llm_client,
        model=groq_cfg.model,
        current_question=question,
        current_question_number=1,
    )
    store.create(active)

    try:
        langfuse.flush()
    except Exception:
        pass

    timer = get_timer_config(difficulty, n_questions)
    return {
        "interview_id": interview_id,
        "session_id": sid,
        "candidate_name": name,
        "welcome_message": build_welcome_message(name, role),
        "question_number": 1,
        "total_questions": n_questions,
        "question": question,
        "role": role,
        "difficulty": difficulty,
        "per_question_seconds": timer["per_question_seconds"],
        "total_seconds": timer["total_seconds"],
    }


def submit_answer(*, interview_id: str, answer: str) -> dict[str, Any]:
    active = store.get(interview_id)
    if not active:
        raise KeyError("Interview not found")
    if active.status == "completed":
        raise ValueError("Interview already completed")

    answer = answer.strip()
    if not answer:
        raise ValueError("Answer cannot be empty")

    i = active.current_question_number
    q = active.current_question
    trace_context = {"trace_id": active.trace_id}

    with propagate_attributes(session_id=active.state.session_id):
        with active.langfuse.start_as_current_observation(
            trace_context=trace_context,
            as_type="span",
            name="accept_user_answer",
            input={"question_number": i, "question": q},
            output={"answer": answer},
            metadata={
                "role": active.state.role,
                "difficulty": active.state.difficulty,
                "session_id": active.state.session_id,
                "question_number": i,
            },
        ):
            pass

        ev, ev_meta = evaluate_answer(
            langfuse=active.langfuse,
            llm_client=active.llm_client,
            model=active.model,
            state=active.state,
            question_number=i,
            question=q,
            answer=answer,
            trace_context=trace_context,
        )

        try:
            active.langfuse.create_score(
                name="answer_score",
                value=ev.score,
                trace_id=active.trace_id,
                data_type="NUMERIC",
                comment=f"Question {i} score",
            )
        except Exception:
            pass

        active.state.add_item(
            QAItem(
                question_number=i,
                question=q,
                answer=answer,
                evaluation=ev,
                metadata={"evaluation_meta": ev_meta},
            )
        )

        if i >= active.state.n_questions:
            report = generate_final_report(
                langfuse=active.langfuse,
                llm_client=active.llm_client,
                model=active.model,
                state=active.state,
                trace_id=active.trace_id,
                trace_context=trace_context,
            )
            active.final_report = report
            active.status = "completed"
            result = {
                "completed": True,
                "question_number": i,
                "total_questions": active.state.n_questions,
            }
        else:
            next_num = i + 1
            next_q, _ = generate_question(
                langfuse=active.langfuse,
                llm_client=active.llm_client,
                model=active.model,
                state=active.state,
                question_number=next_num,
                trace_context=trace_context,
            )
            active.current_question = next_q
            active.current_question_number = next_num
            result = {
                "completed": False,
                "question_number": next_num,
                "total_questions": active.state.n_questions,
                "question": next_q,
            }

    try:
        active.langfuse.flush()
    except Exception:
        pass

    return result


def get_report(*, interview_id: str) -> dict[str, Any]:
    active = store.get(interview_id)
    if not active:
        raise KeyError("Interview not found")
    if active.status != "completed" or not active.final_report:
        raise ValueError("Interview not completed yet")

    report = active.final_report
    return {
        "session_id": active.state.session_id,
        "candidate_name": active.state.candidate_name,
        "role": active.state.role,
        "difficulty": active.state.difficulty,
        "per_question_feedback": [qa_item_to_dict(item) for item in active.state.items],
        "final_report": final_report_to_dict(report),
    }
