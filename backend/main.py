import json
import os
from pathlib import Path
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from cache import cache_get, cache_set
from constants import CRISIS_RESPONSE, EMOTION_VALENCE, is_crisis
from llm import call_llm, maybe_summarise, stream_llm
from models import ChatRequest, ChatResponse, EmotionField, MoodTrend
from privacy import scrub_pii
from prompts import DISCLAIMER, SYSTEM_PROMPT

load_dotenv()

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Emotional Intelligence Bot")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Static frontend ───────────────────────────────────────────────────────────
_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if _DIST.exists():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")


# ── Security headers middleware ───────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


# ── Constants ─────────────────────────────────────────────────────────────────
_SAFE_DEFAULT = ChatResponse(
    persona_opener="Thanks for sharing that with me.",
    emotion=EmotionField(primary="unknown", secondary=None, confidence="low"),
    reflection="I'm having a little trouble understanding right now — I want to make sure I get this right.",
    needs_clarification=True,
    clarifying_question="Could you share a bit more about what's going on for you?",
    suggestions=[],
    follow_up="What would feel most helpful to talk about right now?",
    bot_wants_reply=True,
    disclaimer=DISCLAIMER,
)

_RETRY_SUFFIX = (
    "Your previous response was not valid JSON. "
    "Return ONLY the raw JSON object — no markdown, no fences, no explanation."
)


# ── Helpers ───────────────────────────────────────────────────────────────────
def _slim_assistant_turn(content: str) -> str:
    """Strip suggestion details, disclaimer, and mood_trend from history entries.
    Keeps emotion, reflection, clarifying_question, and follow_up so the bot
    remembers what it asked and can reference the user's response naturally."""
    try:
        d = json.loads(content)
        return json.dumps(
            {
                "emotion": d.get("emotion"),
                "reflection": d.get("reflection"),
                "clarifying_question": d.get("clarifying_question"),
                "follow_up": d.get("follow_up"),
            },
            separators=(",", ":"),
        )
    except (json.JSONDecodeError, KeyError, TypeError):
        return content


def _build_messages(history: list[dict], user_message: str) -> list[dict]:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in history:
        if turn["role"] == "assistant":
            messages.append({"role": "assistant", "content": _slim_assistant_turn(turn["content"])})
        else:
            messages.append(turn)
    # Wrap user message in XML delimiters to resist prompt injection
    messages.append({"role": "user", "content": f"<user_message>\n{user_message}\n</user_message>"})
    return messages


def _clean_json(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
    return text.strip()


async def _parse_response(raw: str) -> ChatResponse:
    return ChatResponse.model_validate(json.loads(_clean_json(raw)))


def _compute_mood_trend(history: list[dict], current_emotion: str) -> MoodTrend | None:
    past_scores: list[int] = []
    for turn in history:
        if turn.get("role") != "assistant":
            continue
        try:
            data = json.loads(turn["content"])
            primary = data.get("emotion", {}).get("primary", "").lower()
            past_scores.append(EMOTION_VALENCE.get(primary, 0))
        except (json.JSONDecodeError, KeyError, AttributeError):
            continue

    if len(past_scores) < 2:
        return None

    current_score = EMOTION_VALENCE.get(current_emotion.lower(), 0)
    recent_avg = sum(past_scores[-3:]) / len(past_scores[-3:])
    delta = current_score - recent_avg

    if delta > 0.4:
        return MoodTrend(direction="improving", note="Your emotional tone seems to be lifting compared to earlier.")
    elif delta < -0.4:
        return MoodTrend(direction="worsening", note="It sounds like things may be feeling heavier — that's okay to acknowledge.")
    elif len(set(past_scores[-3:])) > 1:
        return MoodTrend(direction="fluctuating", note="Your mood seems to be shifting — that kind of variability is completely normal.")
    return MoodTrend(direction="stable", note="Your emotional tone has been fairly consistent throughout our conversation.")


async def _run_chat(req: ChatRequest) -> ChatResponse:
    """Core chat logic shared by /chat and /chat/stream."""
    # 1. Crisis check — no LLM call
    if is_crisis(req.message):
        return CRISIS_RESPONSE

    # 2. PII scrub before sending to LLM
    clean_message = scrub_pii(req.message)

    # 3. Cache lookup (keyed on scrubbed message + slimmed history)
    history_dicts = [h.model_dump() for h in req.history]
    cached = cache_get(clean_message, history_dicts)
    if cached:
        return ChatResponse.model_validate(cached)

    # 4. Compress long histories
    history = await maybe_summarise(history_dicts)

    # 5. Build messages + call LLM
    messages = _build_messages(history, clean_message)
    try:
        raw = await call_llm(messages)
    except Exception:
        return _SAFE_DEFAULT

    try:
        response = await _parse_response(raw)
    except (json.JSONDecodeError, ValidationError, KeyError):
        messages.append({"role": "assistant", "content": raw})
        messages.append({"role": "user", "content": _RETRY_SUFFIX})
        try:
            raw2 = await call_llm(messages)
            response = await _parse_response(raw2)
        except Exception:
            return _SAFE_DEFAULT

    # 6. Attach mood trend (computed locally, no LLM call)
    response.mood_trend = _compute_mood_trend(history_dicts, response.emotion.primary)

    # 7. Cache the result
    cache_set(clean_message, history_dicts, response.model_dump())

    return response


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
async def chat(request: Request, req: ChatRequest):
    return await _run_chat(req)


@app.post("/chat/stream")
@limiter.limit("5/minute")
async def chat_stream(request: Request, req: ChatRequest):
    async def event_generator() -> AsyncGenerator[str, None]:
        yield f"data: {json.dumps({'status': 'thinking'})}\n\n"

        if is_crisis(req.message):
            payload = json.dumps({"status": "complete", "response": CRISIS_RESPONSE.model_dump()})
            yield f"data: {payload}\n\n"
            yield f"data: {json.dumps({'status': 'done'})}\n\n"
            return

        clean_message = scrub_pii(req.message)
        history_dicts = [h.model_dump() for h in req.history]

        cached = cache_get(clean_message, history_dicts)
        if cached:
            payload = json.dumps({"status": "complete", "response": cached})
            yield f"data: {payload}\n\n"
            yield f"data: {json.dumps({'status': 'done'})}\n\n"
            return

        history = await maybe_summarise(history_dicts)
        messages = _build_messages(history, clean_message)

        # Stream chunks to frontend as they arrive
        raw_chunks: list[str] = []
        try:
            async for chunk in stream_llm(messages):
                raw_chunks.append(chunk)
                yield f"data: {json.dumps({'status': 'typing_chunk', 'text': chunk})}\n\n"
        except Exception:
            yield f"data: {json.dumps({'status': 'complete', 'response': _SAFE_DEFAULT.model_dump()})}\n\n"
            yield f"data: {json.dumps({'status': 'done'})}\n\n"
            return

        raw = "".join(raw_chunks)
        try:
            response = await _parse_response(raw)
        except (json.JSONDecodeError, ValidationError, KeyError):
            messages.append({"role": "assistant", "content": raw})
            messages.append({"role": "user", "content": _RETRY_SUFFIX})
            try:
                raw2 = await call_llm(messages)
                response = await _parse_response(raw2)
            except Exception:
                response = _SAFE_DEFAULT

        response.mood_trend = _compute_mood_trend(history_dicts, response.emotion.primary)
        cache_set(clean_message, history_dicts, response.model_dump())

        payload = json.dumps({"status": "complete", "response": response.model_dump()})
        yield f"data: {payload}\n\n"
        yield f"data: {json.dumps({'status': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── Catch-all: serve React app ────────────────────────────────────────────────
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str):
    # Serve static files from dist root (icon.svg, manifest, etc.)
    candidate = _DIST / full_path
    if candidate.is_file():
        return FileResponse(candidate)
    # Fall back to index.html for all client-side routes
    index = _DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    return {"detail": "Frontend not built. Run: cd frontend && npm run build"}
