from __future__ import annotations

import os
from pathlib import Path
from dataclasses import dataclass
from typing import Any, Optional

from langfuse import Langfuse

from app.config import BACKEND_ROOT


@dataclass(frozen=True)
class LangfuseConfig:
    public_key: str
    secret_key: str
    host: str


def _clean_env_value(val: str) -> str:
    v = val.strip()
    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
        v = v[1:-1].strip()
    for sep in (" #", "\t#"):
        if sep in v:
            v = v.split(sep, 1)[0].strip()
    return v


def _get_env(name: str) -> str:
    val = _clean_env_value(os.getenv(name, ""))
    if not val:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return val


def load_langfuse_config() -> LangfuseConfig:
    host = _clean_env_value(os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com"))
    return LangfuseConfig(
        public_key=_get_env("LANGFUSE_PUBLIC_KEY"),
        secret_key=_get_env("LANGFUSE_SECRET_KEY"),
        host=host,
    )


def make_langfuse() -> Langfuse:
    cfg = load_langfuse_config()
    return Langfuse(public_key=cfg.public_key, secret_key=cfg.secret_key, host=cfg.host)


_SESSION_COUNTER_PATH = BACKEND_ROOT / ".session_counter"


def next_sequential_session_id() -> str:
    """
    Persistent sequential session id ("1", "2", ...), stored in `.session_counter`
    next to this file.
    """
    if _SESSION_COUNTER_PATH.exists():
        current_raw = _SESSION_COUNTER_PATH.read_text(encoding="utf-8").strip()
        current = int(current_raw) if current_raw else 0
    else:
        current = 0

    nxt = current + 1
    _SESSION_COUNTER_PATH.write_text(str(nxt), encoding="utf-8")
    return str(nxt)


def new_session_id() -> str:
    # Backwards-compatible alias: previously this was a UUID.
    return next_sequential_session_id()


def langfuse_error_payload(exc: BaseException) -> dict[str, Any]:
    return {
        "error_type": exc.__class__.__name__,
        "error_message": str(exc),
    }


def safe_update(observation: Any, *, output: Optional[Any] = None, metadata: Optional[dict[str, Any]] = None) -> None:
    """
    Best-effort wrapper around observation.update() to avoid cascading failures.
    """
    try:
        kwargs: dict[str, Any] = {}
        if output is not None:
            kwargs["output"] = output
        if metadata is not None:
            kwargs["metadata"] = metadata
        if kwargs:
            observation.update(**kwargs)
    except Exception:
        # Never crash app due to telemetry
        return

