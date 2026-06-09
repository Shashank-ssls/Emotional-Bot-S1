import json
import os
from typing import AsyncGenerator

import litellm
from dotenv import load_dotenv

from prompts import SUMMARY_PROMPT

load_dotenv()

# Suppress LiteLLM verbose logging — message content must not appear in logs
os.environ["LITELLM_LOG"] = "ERROR"
litellm.suppress_debug_info = True
litellm.drop_params = True  # silently ignore unsupported params per provider

_model = os.getenv("LLM_PROVIDER_MODEL", "anthropic/claude-sonnet-4-5")
_api_key = os.getenv("LLM_API_KEY")
SUMMARY_THRESHOLD = int(os.getenv("SUMMARY_THRESHOLD", "6"))
_MAX_TOKENS = 500


async def call_llm(messages: list[dict], json_mode: bool = True) -> str:
    kwargs: dict = dict(
        model=_model,
        messages=messages,
        api_key=_api_key,
        temperature=0.3,
        max_tokens=_MAX_TOKENS,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = await litellm.acompletion(**kwargs)
    return response.choices[0].message.content


async def stream_llm(messages: list[dict]) -> AsyncGenerator[str, None]:
    """Yield raw text chunks from a streaming LLM call."""
    response = await litellm.acompletion(
        model=_model,
        messages=messages,
        api_key=_api_key,
        temperature=0.3,
        max_tokens=_MAX_TOKENS,
        stream=True,
        response_format={"type": "json_object"},
    )
    async for chunk in response:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content


async def maybe_summarise(history: list[dict]) -> list[dict]:
    """Compress old turns into a summary when history grows long."""
    if len(history) <= SUMMARY_THRESHOLD:
        return history

    older = history[:-4]
    recent = history[-4:]

    transcript_lines = []
    for turn in older:
        role = turn.get("role", "")
        content = turn.get("content", "")
        if role == "user":
            transcript_lines.append(f"User: {content}")
        elif role == "assistant":
            try:
                data = json.loads(content)
                transcript_lines.append(f"Bot reflection: {data.get('reflection', content)}")
            except (json.JSONDecodeError, KeyError, TypeError):
                transcript_lines.append(f"Bot: {content}")

    transcript = "\n".join(transcript_lines)
    summary_messages = [
        {"role": "system", "content": SUMMARY_PROMPT},
        {"role": "user", "content": transcript},
    ]
    try:
        summary_text = await call_llm(summary_messages, json_mode=False)
    except Exception:
        return recent  # if summarization fails, keep the 4 most recent turns

    return [
        {"role": "system", "content": f"Conversation summary: {summary_text.strip()}"},
        *recent,
    ]
