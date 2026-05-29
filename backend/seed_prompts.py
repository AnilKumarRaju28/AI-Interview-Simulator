from __future__ import annotations

"""
Seed Langfuse Prompt Management with the prompts used by this project.

Run:
  python seed_prompts.py

This keeps the runtime app free of hardcoded prompt text.
"""

from app.config import load_env
from app.core.langfuse_utils import make_langfuse
from app.prompts import EVALUATION_PROMPT_NAME, FINAL_REPORT_PROMPT_NAME, QUESTION_PROMPT_NAME


def main() -> None:
    load_env()
    langfuse = make_langfuse()

    # 1) Question generation (chat prompt)
    langfuse.create_prompt(
        name=QUESTION_PROMPT_NAME,
        type="chat",
        labels=["production"],
        config={"temperature": 0.6},
        prompt=[
            {
                "role": "system",
                "content": (
                    "You are a technical interviewer. Ask ONE concise technical interview question.\n"
                    "Adapt difficulty based on the signal and prior weaknesses/strengths.\n"
                    "Return ONLY the question text, no preamble, no answer."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Role: {{role}}\n"
                    "Difficulty: {{difficulty}}\n"
                    "Question number: {{question_number}} / {{total_questions}}\n"
                    "Adaptive signal: {{adapt_signal}}\n"
                    "Prior strengths: {{prior_strengths}}\n"
                    "Prior weaknesses: {{prior_weaknesses}}\n"
                    "Recent history:\n{{history_summary}}\n\n"
                    "Ask the next question now."
                ),
            },
        ],
    )

    # 2) Answer evaluation (chat prompt) - STRICT JSON output
    langfuse.create_prompt(
        name=EVALUATION_PROMPT_NAME,
        type="chat",
        labels=["production"],
        config={"temperature": 0.2},
        prompt=[
            {
                "role": "system",
                "content": (
                    "You are a strict interview grader.\n"
                    "Score the candidate's answer from 0 to 10.\n"
                    "Return STRICT JSON only (no markdown, no extra text)."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Role: {{role}}\n"
                    "Difficulty: {{difficulty}}\n"
                    "Prior strengths: {{prior_strengths}}\n"
                    "Prior weaknesses: {{prior_weaknesses}}\n\n"
                    "Question:\n{{question}}\n\n"
                    "Candidate answer:\n{{answer}}\n\n"
                    "Return JSON with keys:\n"
                    '{\n'
                    '  "score": number (0-10),\n'
                    '  "strengths": [string, ...],\n'
                    '  "weaknesses": [string, ...],\n'
                    '  "missing_concepts": [string, ...],\n'
                    '  "summary": string\n'
                    '}\n'
                    "Keep arrays short (max ~5 items each)."
                ),
            },
        ],
    )

    # 3) Final report (chat prompt)
    langfuse.create_prompt(
        name=FINAL_REPORT_PROMPT_NAME,
        type="chat",
        labels=["production"],
        config={"temperature": 0.3},
        prompt=[
            {
                "role": "system",
                "content": (
                    "You are an interview panel summarizer.\n"
                    "Write a final report with: overall score, strengths, weaknesses, improvements, recommendation.\n"
                    "Be concrete and concise."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Role: {{role}}\n"
                    "Difficulty: {{difficulty}}\n"
                    "Questions: {{n_questions}}\n"
                    "Average score: {{average_score}}/10\n"
                    "Strengths (aggregate): {{strengths}}\n"
                    "Weaknesses (aggregate): {{weaknesses}}\n\n"
                    "Transcript:\n{{transcript}}\n\n"
                    "Generate the final report now."
                ),
            },
        ],
    )

    try:
        langfuse.flush()
    except Exception:
        pass

    print("Seeded prompts into Langfuse Prompt Management:")
    print(f"- {QUESTION_PROMPT_NAME}")
    print(f"- {EVALUATION_PROMPT_NAME}")
    print(f"- {FINAL_REPORT_PROMPT_NAME}")


if __name__ == "__main__":
    main()

