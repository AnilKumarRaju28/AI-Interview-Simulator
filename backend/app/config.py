from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_ROOT.parent


def load_env() -> None:
    """Load `.env` from backend/ first, then project root (fallback)."""
    load_dotenv(BACKEND_ROOT / ".env")
    load_dotenv(PROJECT_ROOT / ".env")
