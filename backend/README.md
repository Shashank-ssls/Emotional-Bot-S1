# Solace — Backend

FastAPI backend for the Solace emotional intelligence chatbot. Handles chat requests, LLM communication, response streaming, crisis detection, PII scrubbing, response caching, and serving the compiled frontend.

---

## Requirements

- Python 3.11 or later
- An API key for a supported LLM provider

---

## Setup

```bash
# From the project root
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

cd backend
pip install -r requirements.txt
```

---

## Configuration

Create a `.env` file in the `backend/` directory. Use `.env.example` as the template:

```bash
cp .env.example .env
```

### Required variables

| Variable | Description |
|---|---|
| `LLM_PROVIDER_MODEL` | Provider and model in `provider/model` format (see below) |
| `LLM_API_KEY` | API key for the chosen provider |

### Optional variables

| Variable | Default | Description |
|---|---|---|
| `SUMMARY_THRESHOLD` | `6` | Number of conversation turns before history is compressed into a summary |

### Supported providers

Uncomment the relevant block in `.env` for the provider you want to use.

| Provider | Example model value |
|---|---|
| Anthropic | `anthropic/claude-sonnet-4-5` |
| OpenAI | `openai/gpt-4o` |
| Google Gemini | `gemini/gemini-2.0-flash` |
| DeepSeek | `deepseek/deepseek-chat` |
| Moonshot / Kimi | `openai/moonshot-v1-8k` |
| OpenRouter | `openrouter/anthropic/claude-sonnet-4-5` |

For Moonshot/Kimi, also set `OPENAI_API_BASE=https://api.moonshot.cn/v1` in `.env`.

---

## Running

The backend **must be started from the `backend/` directory** because it uses relative imports.

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

For development with auto-reload:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The server will serve the compiled frontend from `../frontend/dist/` if that directory exists. If not built yet, API endpoints still work — only the frontend UI is missing.

---

## API Endpoints

### `GET /health`
Returns `{"status": "ok"}`. Use to confirm the server is running.

### `POST /chat`
Non-streaming chat. Returns a complete response once the LLM finishes.

**Rate limit:** 10 requests per minute per IP.

**Request body:**
```json
{
  "message": "string (1–1500 characters)",
  "history": [
    { "role": "user" | "assistant", "content": "string (max 4000 chars)" }
  ]
}
```

**Response:** `ChatResponse` object (see [Response Schema](#response-schema)).

### `POST /chat/stream`
Streaming chat via Server-Sent Events. Yields events as the LLM generates output.

**Rate limit:** 5 requests per minute per IP.

**Request body:** Same as `/chat`.

**Event sequence:**

| Event `status` | Payload | Meaning |
|---|---|---|
| `thinking` | — | LLM call has started |
| `typing_chunk` | `text: string` | Raw LLM output chunk |
| `complete` | `response: ChatResponse` | Full parsed response |
| `done` | — | Stream is finished |

If an error occurs at any point, a `complete` event with a safe fallback response is sent, followed by `done`.

### `GET /{path}`
Catch-all route. Serves files from `frontend/dist/` or falls back to `index.html` for client-side routing.

---

## Response Schema

```
ChatResponse
├── persona_opener      string   short warm acknowledgment (≤ 8 words)
├── emotion
│   ├── primary         string   detected primary emotion
│   ├── secondary       string | null
│   └── confidence      "low" | "medium" | "high"
├── reflection          string   empathetic reflection of what the user shared
├── needs_clarification boolean
├── clarifying_question string | null
├── suggestions         array
│   ├── title           string
│   ├── detail          string
│   └── intensity       "gentle" | "moderate" | "active"
├── follow_up           string   question to continue the dialogue
├── disclaimer          string
└── mood_trend          object | null
    ├── direction        "improving" | "worsening" | "stable" | "fluctuating"
    └── note             string
```

---

## How It Works

1. **Crisis check** — If the message contains crisis-related language, a hardcoded safety response is returned immediately. No LLM call is made.
2. **PII scrub** — Email addresses, phone numbers, and URLs are replaced with placeholders before being sent to the LLM.
3. **Cache lookup** — If an identical (scrubbed message + history) combination was seen within the last 60 seconds, the cached response is returned.
4. **History compression** — Once the conversation exceeds `SUMMARY_THRESHOLD` turns, older turns are summarised by the LLM to reduce token usage.
5. **LLM call** — The message and compressed history are sent to the configured provider.
6. **Mood trend** — Computed locally from emotion valence scores across the conversation history. No additional LLM call.
7. **Cache store** — The response is cached for 60 seconds.

---

## Project Structure

```
backend/
├── main.py          # FastAPI app, endpoints, request pipeline
├── llm.py           # LLM calls (call_llm, stream_llm, maybe_summarise)
├── models.py        # Pydantic request/response models
├── prompts.py       # System prompt and summary prompt
├── constants.py     # Crisis keywords, crisis response, emotion valence map
├── privacy.py       # PII scrubbing (email, phone, URL)
├── cache.py         # In-memory LRU response cache (TTL 60s, max 256 entries)
├── requirements.txt
├── .env.example
└── .env             # Your local config — never commit this
```
