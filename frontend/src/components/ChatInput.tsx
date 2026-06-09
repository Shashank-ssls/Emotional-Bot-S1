import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  onBreathingOpen: () => void;
  onCancel: () => void;
  disabled: boolean;
}

const MAX_CHARS = 1500;
const COUNTER_THRESHOLD = 1200;

export function ChatInput({ onSend, onBreathingOpen, onCancel, disabled }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 24;
    const maxHeight = lineHeight * 6;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
  };

  useEffect(() => { resize(); }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === '/' && value === '') {
      e.preventDefault();
      onBreathingOpen();
    }
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const showCounter = value.length > COUNTER_THRESHOLD;
  const canSend = !!value.trim() && !disabled;

  return (
    <div
      className="no-print"
      style={{
        position: 'sticky',
        bottom: 0,
        background: 'color-mix(in srgb, var(--color-bg) 90%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--color-border)',
        padding: '12px 24px 16px',
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 24,
            padding: '10px 10px 10px 18px',
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Solace is thinking…' : "What's on your mind?"}
            maxLength={MAX_CHARS}
            rows={1}
            disabled={disabled}
            aria-label="Message input"
            style={{
              flex: 1,
              resize: 'none',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--color-text)',
              fontSize: 15,
              lineHeight: '24px',
              fontFamily: 'inherit',
              fontStyle: value || disabled ? 'normal' : 'italic',
              opacity: disabled ? 0.45 : 1,
              overflowY: 'hidden',
            }}
          />

          {/* Cancel button while streaming, send otherwise */}
          {disabled ? (
            <button
              onClick={onCancel}
              aria-label="Cancel response"
              title="Cancel response"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 200ms ease, color 200ms ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--color-primary) 10%, transparent)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
              }}
            >
              <Square size={13} />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: canSend ? 'var(--color-primary)' : 'var(--color-border)',
                color: canSend ? '#fff' : 'var(--color-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canSend ? 'pointer' : 'not-allowed',
                flexShrink: 0,
                transition: 'background 300ms ease, color 300ms ease',
              }}
            >
              <ArrowUp size={16} />
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            padding: '2px 4px',
          }}
        >
          <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: 0, opacity: 0.85, textAlign: 'center' }}>
            Solace makes life better. Press{' '}
            <span style={{ fontFamily: 'monospace', background: 'color-mix(in srgb, var(--color-border) 80%, transparent)', borderRadius: 4, padding: '1px 5px', fontSize: 11 }}>
              /
            </span>
            {' '}for a breathing exercise.
          </p>
          {showCounter && (
            <span
              style={{
                fontSize: 11,
                color: value.length > MAX_CHARS - 50 ? 'var(--color-primary)' : 'var(--color-muted)',
                opacity: 0.8,
              }}
            >
              {value.length} / {MAX_CHARS}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
