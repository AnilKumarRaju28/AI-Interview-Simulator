from __future__ import annotations

import json
import os
import sys
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass
from itertools import cycle
from typing import Any, Callable, Optional, TypeVar


T = TypeVar("T")


def is_debug() -> bool:
    return os.getenv("DEBUG", "0").strip() == "1"


def now_ms() -> int:
    return int(time.time() * 1000)


@dataclass
class TimedResult:
    value: Any
    latency_ms: int


def timed(fn: Callable[[], T]) -> TimedResult:
    start = now_ms()
    value = fn()
    end = now_ms()
    return TimedResult(value=value, latency_ms=end - start)


def read_int(
    prompt: str,
    *,
    min_value: Optional[int] = None,
    max_value: Optional[int] = None,
    default: Optional[int] = None,
) -> int:
    while True:
        raw = input(prompt).strip()
        if raw == "" and default is not None:
            return default
        try:
            val = int(raw)
        except ValueError:
            print("Please enter a valid number.")
            continue
        if min_value is not None and val < min_value:
            print(f"Please enter a number >= {min_value}.")
            continue
        if max_value is not None and val > max_value:
            print(f"Please enter a number <= {max_value}.")
            continue
        return val


def read_choice(prompt: str, choices: list[str], *, default_index: Optional[int] = None) -> str:
    while True:
        raw = input(prompt).strip()
        if raw == "" and default_index is not None:
            return choices[default_index]
        try:
            idx = int(raw)
        except ValueError:
            print("Please enter a valid option number.")
            continue
        if idx < 1 or idx > len(choices):
            print("Please select a valid option number.")
            continue
        return choices[idx - 1]


def safe_json_loads(text: str) -> Any:
    """
    Best-effort JSON parse.
    Also supports JSON wrapped in markdown code fences.
    """
    t = text.strip()
    if t.startswith("```"):
        # Strip leading fence line and trailing fence
        lines = t.splitlines()
        if len(lines) >= 2 and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        t = "\n".join(lines).strip()
    return json.loads(t)


def die(msg: str, code: int = 1) -> None:
    print(msg)
    raise SystemExit(code)


def eprint(*args: Any, **kwargs: Any) -> None:
    print(*args, file=sys.stderr, **kwargs)


@contextmanager
def spinner(message: str, *, interval_s: float = 0.12) -> Any:
    """
    Minimal terminal spinner for long-running steps.
    """
    stop = threading.Event()

    def run() -> None:
        frames = cycle(["|", "/", "-", "\\"])
        while not stop.is_set():
            sys.stdout.write(f"\r{message} {next(frames)}")
            sys.stdout.flush()
            time.sleep(interval_s)
        sys.stdout.write("\r" + (" " * (len(message) + 2)) + "\r")
        sys.stdout.flush()

    t = threading.Thread(target=run, daemon=True)
    t.start()
    try:
        yield
    finally:
        stop.set()
        t.join(timeout=1)

