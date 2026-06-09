import hashlib
import json
import time
from cachetools import LRUCache

_CACHE_TTL = 60  # seconds
_CACHE_MAX = 256

# Each entry: {"response": ChatResponse dict, "ts": float}
_store: LRUCache = LRUCache(maxsize=_CACHE_MAX)


def _make_key(message: str, history: list) -> str:
    payload = json.dumps({"m": message, "h": history}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode()).hexdigest()


def cache_get(message: str, history: list) -> dict | None:
    key = _make_key(message, history)
    entry = _store.get(key)
    if entry and (time.monotonic() - entry["ts"]) < _CACHE_TTL:
        return entry["response"]
    return None


def cache_set(message: str, history: list, response: dict) -> None:
    key = _make_key(message, history)
    _store[key] = {"response": response, "ts": time.monotonic()}
