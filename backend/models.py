from typing import Literal, Optional
from pydantic import BaseModel, Field


class EmotionField(BaseModel):
    primary: str
    secondary: Optional[str] = None
    confidence: str  # low | medium | high


class Suggestion(BaseModel):
    title: str
    detail: str
    intensity: str  # gentle | moderate | active


class MoodTrend(BaseModel):
    direction: str  # improving | worsening | stable | fluctuating | unknown
    note: str


class ChatResponse(BaseModel):
    persona_opener: str          # short warm acknowledgment, ≤ 8 words
    emotion: EmotionField
    reflection: str
    needs_clarification: bool
    clarifying_question: Optional[str] = None
    suggestions: list[Suggestion]
    follow_up: str               # natural question to continue the dialogue
    bot_wants_reply: bool        # true when bot has asked a question
    disclaimer: str
    mood_trend: Optional[MoodTrend] = None


class HistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1500, strip_whitespace=True)
    history: list[HistoryItem] = Field(default=[], max_length=40)
