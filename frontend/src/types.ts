export type Confidence = 'low' | 'medium' | 'high';
export type Intensity = 'gentle' | 'moderate' | 'active';
export type TrendDirection = 'improving' | 'worsening' | 'stable' | 'fluctuating';

export interface Emotion {
  primary: string;
  secondary: string | null;
  confidence: Confidence;
}

export interface Suggestion {
  title: string;
  detail: string;
  intensity: Intensity;
}

export interface MoodTrend {
  direction: TrendDirection;
  note: string;
}

export interface ChatResponse {
  persona_opener: string;
  emotion: Emotion;
  reflection: string;
  needs_clarification: boolean;
  clarifying_question: string | null;
  suggestions: Suggestion[];
  follow_up: string;
  disclaimer: string;
  mood_trend: MoodTrend | null;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface Session {
  id: string;
  startedAt: number;
  title: string;
  messages: Message[];
}

export type StreamStatus = 'idle' | 'thinking' | 'typing_reflection' | 'complete' | 'done';

export interface SSEEvent {
  status: StreamStatus | 'typing_chunk';
  text?: string;
  response?: ChatResponse;
}
