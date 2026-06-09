# Solace

An emotional intelligence chatbot that listens, reflects, and offers grounded support. Solace uses a large language model to respond with empathy, track mood across a conversation, detect crisis language, and suggest coping strategies — all without storing anything server-side.

---

## Architecture

The project is a single-server application. The FastAPI backend exposes the chat API and also serves the compiled React frontend from `frontend/dist/`. In production, one process handles everything on one port.

```
emotional intelligence bot/
├── backend/        # FastAPI app (Python)
├── frontend/       # React + Vite app (TypeScript)
└── README.md
```

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Python | 3.11 |
| Node.js | 18 |
| npm | 9 |

---

## Quick Start

### 1. Set up the backend

```bash
cd backend
python -m venv ../venv
# Windows
..\venv\Scripts\activate
# macOS / Linux
source ../venv/bin/activate

pip install -r requirements.txt
```

Copy the environment template and fill in your API key:

```bash
cp .env.example .env
# Edit .env — set LLM_PROVIDER_MODEL and LLM_API_KEY
```

See [`backend/README.md`](backend/README.md) for the full list of supported providers and configuration options.

### 2. Build the frontend

```bash
cd frontend
npm install
npm run build
```

This places the compiled app into `frontend/dist/`, which the backend serves automatically.

### 3. Start the server

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000` — the full application is served from that single address.

---

## Development Mode (frontend hot-reload)

Run the backend and the Vite dev server in separate terminals:

```bash
# Terminal 1 — backend
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2 — frontend dev server (proxies API to :8000)
cd frontend && npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/chat` requests to the backend.

---

## Configuration

All runtime configuration lives in `backend/.env`. No secrets belong in source code or frontend files. See [`backend/README.md`](backend/README.md) for details.

---

## Key Features

- **Real-time streaming** — responses stream word by word via Server-Sent Events
- **Mood tracking** — emotion valence is tracked across the conversation and a trend shown
- **Crisis detection** — hardcoded keyword check triggers an immediate, LLM-free safety response
- **PII scrubbing** — email addresses, phone numbers, and URLs in user messages are replaced with placeholders before being sent to the LLM
- **Response caching** — identical messages within a 60-second window return a cached response
- **History compression** — long conversation histories are summarised to stay within token limits
- **Ambient sound** — optional background audio (rain, hum, waves) generated entirely in the browser via Web Audio API; no audio files required
- **Conversation history** — sessions are saved to `localStorage`; nothing is persisted server-side
- **PWA** — installable as a Progressive Web App

---

## What Is Not Stored Server-Side

- Conversation messages
- User identity
- Session data

The server is stateless between requests. All conversation state lives in the browser (`localStorage`).
