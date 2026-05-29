from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

from langfuse import Langfuse, propagate_attributes

from app.core.evaluator import evaluate_answer
from app.core.groq_client import chat_completion_with_fallbacks
from app.core.memory import InterviewState, QAItem
from app.prompts import FINAL_REPORT_PROMPT_NAME, QUESTION_PROMPT_NAME
from app.core.utils import spinner


@dataclass
class FinalReport:
    overall_score: float
    strengths: list[str]
    weaknesses: list[str]
    improvements: list[str]
    recommendation: str
    raw_text: str


def generate_question(
    *,
    langfuse: Langfuse,
    llm_client: Any,
    model: str,
    state: InterviewState,
    question_number: int,
    trace_context: Optional[dict[str, str]] = None,
) -> tuple[str, dict[str, Any]]:
    prompt = langfuse.get_prompt(QUESTION_PROMPT_NAME, type="chat")

    last_score = state.last_score()
    adapt_signal = "start"
    if last_score is not None:
        if last_score >= 8:
            adapt_signal = "strong_previous_answer"
        elif last_score <= 4:
            adapt_signal = "weak_previous_answer"
        else:
            adapt_signal = "average_previous_answer"

    compiled = prompt.compile(
        role=state.role,
        difficulty=state.difficulty,
        question_number=question_number,
        total_questions=state.n_questions,
        prior_weaknesses=", ".join(state.recent_weaknesses()) or "None",
        prior_strengths=", ".join(state.recent_strengths()) or "None",
        adapt_signal=adapt_signal,
        history_summary=_history_summary(state),
    )

    metadata = {
        "role": state.role,
        "difficulty": state.difficulty,
        "session_id": state.session_id,
        "question_number": question_number,
        "model_name": model,
        "prompt_name": QUESTION_PROMPT_NAME,
        "prompt_version": getattr(prompt, "version", None),
        "adaptive_signal": adapt_signal,
    }

    obs_kwargs: dict[str, Any] = {
        "as_type": "generation",
        "name": "generate_question",
        "model": model,
        "input": compiled,
        "metadata": metadata,
    }
    if trace_context:
        obs_kwargs["trace_context"] = trace_context

    with langfuse.start_as_current_observation(**obs_kwargs) as gen:
        q, model_used = chat_completion_with_fallbacks(
            llm_client,
            primary_model=model,
            fallback_models=("llama-3.3-70b-versatile", "llama-3.1-8b-instant"),
            messages=compiled,
            temperature=0.6,
            max_tokens=300,
        )
        if model_used != model:
            gen.update(metadata={**metadata, "model_used": model_used, "model_fallback": True})
        gen.update(output=q)
    return q.strip(), metadata


def run_interview(
    *,
    langfuse: Langfuse,
    llm_client: Any,
    model: str,
    state: InterviewState,
) -> FinalReport:
    trace_id = langfuse.create_trace_id(seed=state.session_id)
    trace_context = {"trace_id": trace_id}

    # Langfuse SDK v4 uses trace_context to bind observations to a trace.
    # There is no explicit "trace" observation type in start_as_current_observation.
    # IMPORTANT: session_id must be propagated (not only stored in metadata)
    # for Langfuse "Sessions" UI to group traces under a session.
    with propagate_attributes(session_id=state.session_id):
        with langfuse.start_as_current_observation(
            trace_context=trace_context,
            as_type="span",
            name="interview_session",
            metadata={
                "role": state.role,
                "difficulty": state.difficulty,
                "n_questions": state.n_questions,
                "session_id": state.session_id,
                "tags": ["terminal", "ai-interview", state.role, state.difficulty],
            },
        ):
            for i in range(1, state.n_questions + 1):
                q, q_meta = generate_question(
                    langfuse=langfuse,
                    llm_client=llm_client,
                    model=model,
                    state=state,
                    question_number=i,
                )

                print("")
                print(f"Question {i}/{state.n_questions}")
                print(q)
                print("")

                answer = _read_non_empty("Your answer: ")

                with langfuse.start_as_current_observation(
                    as_type="span",
                    name="accept_user_answer",
                    input={"question_number": i, "question": q},
                    output={"answer": answer},
                    metadata={
                        "role": state.role,
                        "difficulty": state.difficulty,
                        "session_id": state.session_id,
                        "question_number": i,
                    },
                ):
                    pass

                with spinner("Evaluating your answer..."):
                    ev, ev_meta = evaluate_answer(
                        langfuse=langfuse,
                        llm_client=llm_client,
                        model=model,
                        state=state,
                        question_number=i,
                        question=q,
                        answer=answer,
                    )

                # Attach a Langfuse score at trace level for easy charting
                try:
                    langfuse.create_score(
                        name="answer_score",
                        value=ev.score,
                        trace_id=trace_id,
                        data_type="NUMERIC",
                        comment=f"Question {i} score",
                    )
                except Exception:
                    # Telemetry must not break the interview
                    pass

                state.add_item(
                    QAItem(
                        question_number=i,
                        question=q,
                        answer=answer,
                        evaluation=ev,
                        metadata={"question_meta": q_meta, "evaluation_meta": ev_meta},
                    )
                )

            with spinner("Preparing your final feedback..."):
                report = generate_final_report(
                    langfuse=langfuse,
                    llm_client=llm_client,
                    model=model,
                    state=state,
                    trace_id=trace_id,
                )
            return report


def generate_final_report(
    *,
    langfuse: Langfuse,
    llm_client: Any,
    model: str,
    state: InterviewState,
    trace_id: Optional[str],
    trace_context: Optional[dict[str, str]] = None,
) -> FinalReport:
    prompt = langfuse.get_prompt(FINAL_REPORT_PROMPT_NAME, type="chat")
    compiled = prompt.compile(
        role=state.role,
        difficulty=state.difficulty,
        n_questions=state.n_questions,
        average_score=f"{state.average_score():.2f}",
        transcript=_transcript(state),
        strengths=", ".join(state.recent_strengths(10)) or "None",
        weaknesses=", ".join(state.recent_weaknesses(10)) or "None",
    )

    metadata = {
        "role": state.role,
        "difficulty": state.difficulty,
        "session_id": state.session_id,
        "model_name": model,
        "prompt_name": FINAL_REPORT_PROMPT_NAME,
        "prompt_version": getattr(prompt, "version", None),
        "average_score": state.average_score(),
    }

    obs_kwargs: dict[str, Any] = {
        "as_type": "generation",
        "name": "final_report",
        "model": model,
        "input": compiled,
        "metadata": metadata,
    }
    if trace_context:
        obs_kwargs["trace_context"] = trace_context

    with langfuse.start_as_current_observation(**obs_kwargs) as gen:
        text, model_used = chat_completion_with_fallbacks(
            llm_client,
            primary_model=model,
            fallback_models=("llama-3.3-70b-versatile", "llama-3.1-8b-instant"),
            messages=compiled,
            temperature=0.3,
            max_tokens=700,
        )
        if model_used != model:
            gen.update(metadata={**metadata, "model_used": model_used, "model_fallback": True})
        gen.update(output=text)

    overall = state.average_score()
    rec = _recommendation(overall)
    report = FinalReport(
        overall_score=overall,
        strengths=state.recent_strengths(10),
        weaknesses=state.recent_weaknesses(10),
        improvements=_improvements_from_weaknesses(state.recent_weaknesses(10)),
        recommendation=rec,
        raw_text=text.strip(),
    )

    # Optional: store a final score on the trace
    if trace_id:
        try:
            langfuse.create_score(
                name="overall_score",
                value=report.overall_score,
                trace_id=trace_id,
                data_type="NUMERIC",
                comment="Average of per-question scores",
            )
        except Exception:
            pass

    return report


def _read_non_empty(prompt: str) -> str:
    while True:
        val = input(prompt).strip()
        if val:
            return val
        print("Answer cannot be empty. Please try again.")


def _history_summary(state: InterviewState) -> str:
    if not state.items:
        return "No prior questions yet."
    tail = state.items[-3:]
    parts: list[str] = []
    for it in tail:
        parts.append(
            f"Q{it.question_number}: {it.question}\nA: {it.answer}\nScore: {it.evaluation.score:.1f}/10\n"
        )
    return "\n".join(parts).strip()


def _transcript(state: InterviewState) -> str:
    parts: list[str] = []
    for it in state.items:
        parts.append(f"Q{it.question_number}: {it.question}")
        parts.append(f"A{it.question_number}: {it.answer}")
        parts.append(f"Score: {it.evaluation.score:.1f}/10")
        if it.evaluation.summary:
            parts.append(f"Summary: {it.evaluation.summary}")
        parts.append("")
    return "\n".join(parts).strip()


def _recommendation(score: float) -> str:
    if score >= 8.0:
        return "Strong hire / proceed to next round"
    if score >= 6.5:
        return "Proceed to next round"
    if score >= 5.0:
        return "Borderline — proceed only if other signals are strong"
    return "Do not proceed"


def _improvements_from_weaknesses(weaknesses: list[str]) -> list[str]:
    out: list[str] = []
    for w in weaknesses:
        w = w.strip()
        if not w:
            continue
        out.append(f"Review and practice: {w}")
    # keep short
    return out[:8]

