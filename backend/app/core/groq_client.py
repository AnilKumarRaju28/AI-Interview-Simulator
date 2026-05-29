from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Optional

from openai import OpenAI


@dataclass(frozen=True)
class GroqConfig:
    api_key: str
    model: str
    base_url: str = "https://api.groq.com/openai/v1"
    fallback_models: tuple[str, ...] = (
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
    )


def _clean_env_value(val: str) -> str:
    v = val.strip()
    # Strip surrounding quotes if present
    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
        v = v[1:-1].strip()
    # Remove inline comments: "value # comment"
    for sep in (" #", "\t#"):
        if sep in v:
            v = v.split(sep, 1)[0].strip()
    return v


def _get_env(name: str) -> str:
    val = _clean_env_value(os.getenv(name, ""))
    if not val:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return val


def load_groq_config() -> GroqConfig:
    default_model = "llama-3.3-70b-versatile"
    return GroqConfig(
        api_key=_get_env("GROQ_API_KEY"),
        model=os.getenv("GROQ_MODEL", default_model).strip() or default_model,
    )


def make_groq_client(cfg: Optional[GroqConfig] = None) -> tuple[OpenAI, GroqConfig]:
    cfg = cfg or load_groq_config()
    client = OpenAI(api_key=cfg.api_key, base_url=cfg.base_url)
    return client, cfg


def chat_completion(
    client: OpenAI,
    *,
    model: str,
    messages: list[dict[str, Any]],
    temperature: float = 0.2,
    max_tokens: int = 512,
) -> str:
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return (resp.choices[0].message.content or "").strip()


def chat_completion_with_fallbacks(
    client: OpenAI,
    *,
    primary_model: str,
    fallback_models: tuple[str, ...],
    messages: list[dict[str, Any]],
    temperature: float = 0.2,
    max_tokens: int = 512,
) -> tuple[str, str]:
    """
    Returns (text, model_used).
    If the primary model is decommissioned, falls back to the next model.
    """
    models = (primary_model,) + tuple(m for m in fallback_models if m != primary_model)
    last_exc: Exception | None = None
    for m in models:
        try:
            return (
                chat_completion(
                    client,
                    model=m,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                ),
                m,
            )
        except Exception as e:
            last_exc = e
            msg = str(e).lower()
            if "model" in msg and ("decommissioned" in msg or "no longer supported" in msg):
                continue
            raise
    if last_exc:
        raise last_exc
    raise RuntimeError("Groq chat completion failed unexpectedly.")

