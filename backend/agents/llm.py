"""Shared LLM client factory + retry wrapper for all DonorKhoj agents.

Free-tier OpenRouter models are frequently throttled upstream (HTTP 429).
Every LLM call goes through ainvoke_with_retry so transient failures
self-heal instead of instantly degrading to fallbacks.
"""
import asyncio
import os
from typing import List

from langchain_openai import ChatOpenAI

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

# Short backoff between full rounds — individual models are retried only
# after every model in the chain has had a chance (fail over fast).
RETRY_DELAYS = (3, 10, 20)


def parse_model_chain(raw: str) -> list:
    """Parse comma-separated model list from env (first = primary)."""
    return [m.strip() for m in (raw or "").split(",") if m.strip()]


def get_llm_client(model: str, **kwargs):
    return ChatOpenAI(
        model=model,
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL,
        default_headers={
            "HTTP-Referer": "https://donorkhoj.in",
            "X-Title": "DonorKhoj",
        },
        max_retries=0,  # we handle retries here (with backoff) instead
        **kwargs,
    )


def _retryable(exc: Exception) -> bool:
    msg = str(exc)
    # 429 rate limits, 5xx provider errors, timeouts and connection drops
    return any(s in msg for s in ("429", "500", "502", "503", "529", "timeout", "Timeout",
                                  "ConnectError", "RemoteProtocolError", "Try again"))


async def ainvoke_with_retry(llm, messages: List, attempts: int = 4):
    """Invoke an LLM with exponential backoff on transient errors."""
    last: Exception | None = None
    for i in range(attempts):
        try:
            return await llm.ainvoke(messages)
        except Exception as e:  # noqa: BLE001
            last = e
            if i < attempts - 1 and _retryable(e):
                await asyncio.sleep(RETRY_DELAYS[min(i, len(RETRY_DELAYS) - 1)])
                continue
            raise
    raise last  # pragma: no cover


async def ainvoke_with_fallback(build_llm, models: List[str], messages: List, rounds: int = 3):
    """Try each model in order, then repeat the chain with backoff between rounds.

    Failing over to the next provider is usually faster than retrying a
    throttled one, so a full round across all models comes before any sleep.

    Returns (response, model_used). Raises the last error if everything fails.
    """
    last: Exception | None = None
    for round_i in range(max(1, rounds)):
        for m in models:
            try:
                resp = await build_llm(m).ainvoke(messages)
                return resp, m
            except Exception as e:  # noqa: BLE001
                last = e
                if not _retryable(e):
                    raise
                continue  # next model immediately
        if round_i < rounds - 1:
            await asyncio.sleep(RETRY_DELAYS[min(round_i, len(RETRY_DELAYS) - 1)])
    raise last  # pragma: no cover
