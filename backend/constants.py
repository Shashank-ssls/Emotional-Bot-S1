from models import ChatResponse, EmotionField, Suggestion
from prompts import DISCLAIMER

# ── Crisis detection ──────────────────────────────────────────────────────────

CRISIS_KEYWORDS: list[str] = [
    "suicide",
    "suicidal",
    "self-harm",
    "self harm",
    "selfharm",
    "want to die",
    "wanna die",
    "kill myself",
    "end my life",
    "ending my life",
    "take my life",
    "hurt myself",
    "cutting myself",
    "being abused",
    "abuse me",
    "don't want to live",
    "dont want to live",
    "no reason to live",
    "not worth living",
]

CRISIS_RESPONSE = ChatResponse(
    persona_opener="I'm so glad you reached out.",
    emotion=EmotionField(primary="distress", secondary=None, confidence="high"),
    reflection=(
        "What you're going through sounds incredibly painful, and I'm really glad you reached out. "
        "You don't have to face this alone."
    ),
    needs_clarification=False,
    clarifying_question=None,
    suggestions=[
        Suggestion(
            title="Talk to a crisis professional right now",
            detail=(
                # TODO: replace with region-appropriate numbers
                "Please reach out to a crisis helpline — they are free, confidential, and available 24/7. "
                "Examples: National Suicide Prevention Lifeline (US): 988 | Crisis Text Line: text HOME to 741741 | "
                "International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/"
            ),
            intensity="active",
        )
    ],
    follow_up="Can you tell me if you're somewhere safe right now?",
    bot_wants_reply=True,
    disclaimer=DISCLAIMER,
)


def is_crisis(message: str) -> bool:
    lower = message.lower()
    return any(kw in lower for kw in CRISIS_KEYWORDS)


# ── Emotion valence scoring (for mood trend) ──────────────────────────────────
# +1 = positive, -1 = negative, 0 = neutral/ambiguous

EMOTION_VALENCE: dict[str, int] = {
    # Positive
    "happy": 1, "happiness": 1, "joy": 1, "joyful": 1, "excited": 1,
    "excitement": 1, "hopeful": 1, "hope": 1, "grateful": 1, "gratitude": 1,
    "proud": 1, "pride": 1, "relieved": 1, "relief": 1, "calm": 1,
    "content": 1, "contentment": 1, "love": 1, "loved": 1, "confident": 1,
    "confidence": 1, "optimistic": 1, "optimism": 1, "enthusiastic": 1,
    "motivated": 1, "peaceful": 1, "satisfied": 1, "satisfaction": 1,
    # Negative
    "sad": -1, "sadness": -1, "angry": -1, "anger": -1, "frustrated": -1,
    "frustration": -1, "anxious": -1, "anxiety": -1, "stressed": -1,
    "stress": -1, "overwhelmed": -1, "fear": -1, "scared": -1, "worried": -1,
    "worry": -1, "hopeless": -1, "helpless": -1, "guilty": -1, "guilt": -1,
    "ashamed": -1, "shame": -1, "lonely": -1, "loneliness": -1,
    "depressed": -1, "depression": -1, "grief": -1, "grieving": -1,
    "distress": -1, "hurt": -1, "pain": -1, "exhausted": -1, "exhaustion": -1,
    "lost": -1, "confused": -1, "confusion": -1, "disappointed": -1,
    "disappointment": -1, "jealous": -1, "jealousy": -1, "regret": -1,
    "betrayed": -1, "betrayal": -1,
    # Neutral / ambiguous
    "surprised": 0, "surprise": 0, "curious": 0, "curiosity": 0,
    "unsure": 0, "uncertain": 0, "mixed": 0, "unknown": 0,
}
