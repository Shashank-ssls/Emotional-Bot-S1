import re

_EMAIL = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", re.IGNORECASE)
_PHONE = re.compile(
    r"(\+?\d{1,3}[\s\-.]?)?(\(?\d{2,4}\)?[\s\-.]?)?\d{3,4}[\s\-.]?\d{3,4}([\s\-.]?\d{1,4})?",
)
_URL = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)


def scrub_pii(text: str) -> str:
    """Replace common PII patterns with safe placeholders before sending to the LLM."""
    text = _URL.sub("[LINK]", text)
    text = _EMAIL.sub("[EMAIL]", text)
    text = _PHONE.sub("[PHONE]", text)
    return text
