from __future__ import annotations

from typing import Any, Optional

from langfuse import Langfuse

from app.core.groq_client import chat_completion_with_fallbacks
from app.core.memory import Evaluation, InterviewState
from app.prompts import EVALUATION_PROMPT_NAME
from app.core.utils import safe_json_loads


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def evaluate_answer(
    *,
    langfuse: Langfuse,
    llm_client: Any,
    model: str,
    state: InterviewState,
    question_number: int,
    question: str,
    answer: str,
    trace_context: Optional[dict[str, str]] = None,
) -> tuple[Evaluation, dict[str, Any]]:
    """
    Returns (evaluation, metadata).
    All LLM calls are traced as a Langfuse generation.
    """
    prompt = langfuse.get_prompt(EVALUATION_PROMPT_NAME, type="chat")
    compiled = prompt.compile(
        role=state.role,
        difficulty=state.difficulty,
        question=question,
        answer=answer,
        prior_weaknesses=", ".join(state.recent_weaknesses()) or "None",
        prior_strengths=", ".join(state.recent_strengths()) or "None",
    )

    metadata = {
        "role": state.role,
        "difficulty": state.difficulty,
        "session_id": state.session_id,
        "question_number": question_number,
        "model_name": model,
        "prompt_name": EVALUATION_PROMPT_NAME,
        "prompt_version": getattr(prompt, "version", None),
    }

    obs_kwargs: dict[str, Any] = {
        "as_type": "generation",
        "name": "evaluate_answer",
        "model": model,
        "input": compiled,
        "metadata": metadata,
    }
    if trace_context:
        obs_kwargs["trace_context"] = trace_context

    with langfuse.start_as_current_observation(**obs_kwargs) as gen:
        raw, model_used = chat_completion_with_fallbacks(
            llm_client,
            primary_model=model,
            fallback_models=("llama-3.3-70b-versatile", "llama-3.1-8b-instant"),
            messages=compiled,
            temperature=0.2,
            max_tokens=600,
        )
        if model_used != model:
            gen.update(metadata={**metadata, "model_used": model_used, "model_fallback": True})
        gen.update(output=raw)

    # Parse strict JSON
    parsed: Any = None
    try:
        parsed = safe_json_loads(raw)
    except Exception:
        # If the model returns non-JSON, fall back to a safe default
        parsed = {
            "score": 0,
            "strengths": [],
            "weaknesses": ["Could not parse evaluation output (expected JSON)."],
            "missing_concepts": [],
            "summary": raw[:800],
        }

    score = float(parsed.get("score", 0))
    strengths = list(parsed.get("strengths", []) or [])
    weaknesses = list(parsed.get("weaknesses", []) or [])
    missing = list(parsed.get("missing_concepts", []) or [])
    summary = str(parsed.get("summary", "") or "").strip()

    ev = Evaluation(
        score=_clamp(score, 0.0, 10.0),
        strengths=[str(x).strip() for x in strengths if str(x).strip()],
        weaknesses=[str(x).strip() for x in weaknesses if str(x).strip()],
        missing_concepts=[str(x).strip() for x in missing if str(x).strip()],
        summary=summary,
    )

    return ev, metadata

