import { lazy, Suspense, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, RotateCcw } from 'lucide-react';
import { Orb } from './Orb';
import type { ChatResponse, Suggestion, MoodTrend, Confidence, Intensity, TrendDirection, Message } from '../types';

const MoodSparklineModal = lazy(() =>
  import('./MoodSparklineModal').then((m) => ({ default: m.MoodSparklineModal })),
);

// ─── Timestamp ─────────────────────────────────────────────────────────────────

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Emotion Pills ─────────────────────────────────────────────────────────────

function confidenceRing(confidence: Confidence): React.CSSProperties {
  if (confidence === 'low')
    return { outline: '2px dashed hsl(215,50%,65%)', outlineOffset: 2 };
  if (confidence === 'medium')
    return { outline: '2px solid var(--color-gold)', outlineOffset: 2 };
  return { outline: '2px solid var(--color-secondary)', outlineOffset: 2 };
}

function EmotionPills({
  primary,
  secondary,
  confidence,
}: {
  primary: string;
  secondary: string | null;
  confidence: Confidence;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      <span
        title={`Confidence: ${confidence} — How sure I am about what you're feeling`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          height: 24,
          borderRadius: 12,
          fontSize: 12,
          background: 'var(--color-bot-bubble)',
          border: '1px solid var(--color-primary)',
          color: 'var(--color-text)',
          ...confidenceRing(confidence),
        }}
      >
        {primary}
      </span>
      {secondary && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            height: 24,
            borderRadius: 12,
            fontSize: 12,
            background: 'color-mix(in srgb, var(--color-bot-bubble) 60%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 50%, transparent)',
            color: 'var(--color-muted)',
          }}
        >
          {secondary}
        </span>
      )}
    </div>
  );
}

// ─── Suggestion Card ───────────────────────────────────────────────────────────

const INTENSITY_DOT: Record<Intensity, string> = {
  gentle: 'var(--color-secondary)',
  moderate: 'var(--color-gold)',
  active: 'var(--color-primary)',
};

function SuggestionCard({ suggestion, large = false }: { suggestion: Suggestion; large?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 14,
        borderRadius: 12,
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        position: 'relative',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.06)' : 'none',
        transition: 'transform 300ms ease, box-shadow 300ms ease',
      }}
    >
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span
          aria-hidden="true"
          style={{ width: 8, height: 8, borderRadius: '50%', background: INTENSITY_DOT[suggestion.intensity], flexShrink: 0 }}
        />
        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{suggestion.intensity}</span>
      </div>
      <p style={{ margin: '0 0 4px', fontSize: large ? 16 : 14, fontWeight: 500, color: 'var(--color-text)', paddingRight: 60 }}>
        {suggestion.title}
      </p>
      <p style={{ margin: 0, fontSize: large ? 14 : 13, color: 'var(--color-muted)' }}>
        {suggestion.detail}
      </p>
    </div>
  );
}

// ─── Mood Trend Line ───────────────────────────────────────────────────────────

const TREND_GLYPH: Record<TrendDirection, string> = {
  improving: '↗', worsening: '↘', stable: '→', fluctuating: '↔',
};
const TREND_COLOR: Record<TrendDirection, string> = {
  improving: 'var(--color-secondary)',
  worsening: 'var(--color-primary)',
  stable: 'var(--color-gold)',
  fluctuating: 'hsl(270,30%,65%)',
};

function MoodTrendLine({ trend, messages }: { trend: MoodTrend; messages: Message[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          fontSize: 12,
          color: 'var(--color-muted)',
        }}
        aria-label="View mood trend"
      >
        <span style={{ color: TREND_COLOR[trend.direction], fontSize: 14 }}>{TREND_GLYPH[trend.direction]}</span>
        {trend.note}
      </button>
      <Suspense fallback={null}>
        <MoodSparklineModal open={open} onClose={() => setOpen(false)} messages={messages} />
      </Suspense>
    </>
  );
}

// ─── Typing Indicator ──────────────────────────────────────────────────────────

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}
    >
      <Orb mini />
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-muted)', display: 'inline-block' }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Bot Message Card ──────────────────────────────────────────────────────────

interface BotCardProps {
  response: ChatResponse;
  isPartial?: boolean;
  partialText?: string;
  messages: Message[];
}

function isCrisisResponse(r: ChatResponse): boolean {
  return r.suggestions.some(
    (s) =>
      s.title.toLowerCase().includes('988') ||
      s.detail.toLowerCase().includes('crisis') ||
      s.detail.toLowerCase().includes('helpline'),
  );
}

function BotCard({ response, isPartial = false, partialText = '', messages }: BotCardProps) {
  const crisis = isCrisisResponse(response);
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = [
      response.persona_opener,
      response.reflection,
      response.follow_up && `"${response.follow_up}"`,
    ]
      .filter(Boolean)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [response]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--color-bot-bubble)',
        border: '1px solid var(--color-border)',
        borderLeft: crisis ? '4px solid var(--color-secondary)' : '1px solid var(--color-border)',
        borderRadius: 20,
        padding: '18px 20px',
        maxWidth: '90%',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
      }}
    >
      {/* Copy button — appears on hover, only when not partial */}
      {!isPartial && (
        <AnimatePresence>
          {hovered && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
              onClick={handleCopy}
              aria-label="Copy response"
              title="Copy response"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: copied ? 'var(--color-secondary)' : 'var(--color-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </motion.button>
          )}
        </AnimatePresence>
      )}

      {/* 1. Opener */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Orb mini />
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-serif)',
            fontSize: '1.2rem',
            fontStyle: 'italic',
            color: 'var(--color-primary)',
            lineHeight: 1.4,
            paddingRight: !isPartial ? 32 : 0,
          }}
        >
          {isPartial ? partialText : response.persona_opener}
        </p>
      </div>

      {/* 2–7: Only shown when not partial */}
      <AnimatePresence>
        {!isPartial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <p style={{ margin: 0, fontSize: '1em', color: 'var(--color-text)', lineHeight: 1.65 }}>
              {response.reflection}
            </p>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }}>
              <EmotionPills
                primary={response.emotion.primary}
                secondary={response.emotion.secondary}
                confidence={response.emotion.confidence}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }}>
              {response.needs_clarification && response.clarifying_question ? (
                <div
                  style={{
                    borderLeft: '4px solid var(--color-secondary)',
                    padding: '10px 12px',
                    borderRadius: '0 8px 8px 0',
                    background: 'color-mix(in srgb, var(--color-secondary) 10%, transparent)',
                    fontSize: '1em',
                    color: 'var(--color-text)',
                    lineHeight: 1.55,
                  }}
                >
                  {response.clarifying_question}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {response.suggestions.map((s, i) => (
                    <SuggestionCard key={i} suggestion={s} large={crisis && i === 0} />
                  ))}
                </div>
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              style={{
                margin: 0,
                fontStyle: 'italic',
                paddingLeft: 12,
                borderLeft: '2px solid color-mix(in srgb, var(--color-primary) 40%, transparent)',
                color: 'var(--color-primary)',
                fontSize: '0.93em',
                lineHeight: 1.6,
              }}
            >
              <span aria-hidden="true" style={{ marginRight: 6, opacity: 0.5 }}>"</span>
              {response.follow_up}
            </motion.p>

            {!crisis && response.mood_trend && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.4 }}>
                <MoodTrendLine trend={response.mood_trend} messages={messages} />
              </motion.div>
            )}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', opacity: 0.55, lineHeight: 1.5 }}
            >
              {response.disclaimer}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Error Card ────────────────────────────────────────────────────────────────

function ErrorCard({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        background: 'color-mix(in srgb, var(--color-secondary) 10%, var(--color-bot-bubble))',
        border: '1px solid var(--color-border)',
        borderRadius: 20,
        padding: '14px 18px',
        maxWidth: '80%',
        fontSize: '0.93em',
        color: 'var(--color-muted)',
        fontStyle: 'italic',
        lineHeight: 1.6,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {text}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            alignSelf: 'flex-start',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--color-secondary)',
            fontStyle: 'normal',
            fontFamily: 'inherit',
            padding: 0,
          }}
        >
          <RotateCcw size={12} />
          Try again
        </button>
      )}
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

interface Props {
  message: Message;
  isPartial?: boolean;
  partialText?: string;
  messages: Message[];
  onRetry?: () => void;
}

export function ChatMessage({ message, isPartial = false, partialText = '', messages, onRetry }: Props) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}
        data-role="user"
      >
        <div
          style={{
            background: 'var(--color-user-bubble)',
            borderRadius: 20,
            padding: '12px 16px',
            maxWidth: '75%',
            fontSize: '1em',
            color: 'var(--color-text)',
            lineHeight: 1.6,
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </div>
        {message.timestamp && (
          <span style={{ fontSize: 10, color: 'var(--color-muted)', opacity: 0.55, paddingRight: 4 }}>
            {formatTimestamp(message.timestamp)}
          </span>
        )}
      </motion.div>
    );
  }

  let parsed: (ChatResponse & { __error?: undefined }) | { __error: true; text: string } | null = null;
  try {
    parsed = JSON.parse(message.content);
  } catch {
    parsed = null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}
      data-role="assistant"
    >
      {parsed && '__error' in parsed && parsed.__error ? (
        <ErrorCard text={(parsed as { __error: true; text: string }).text} onRetry={onRetry} />
      ) : parsed ? (
        <BotCard
          response={parsed as ChatResponse}
          isPartial={isPartial}
          partialText={partialText}
          messages={messages}
        />
      ) : (
        <ErrorCard text="Something went quiet on my end. Could you try once more?" onRetry={onRetry} />
      )}
      {message.timestamp && !isPartial && (
        <span style={{ fontSize: 10, color: 'var(--color-muted)', opacity: 0.55, paddingLeft: 4 }}>
          {formatTimestamp(message.timestamp)}
        </span>
      )}
    </motion.div>
  );
}
