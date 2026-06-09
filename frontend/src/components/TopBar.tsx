import { motion, useReducedMotion } from 'framer-motion';
import { Settings, RotateCcw } from 'lucide-react';
import type { Message } from '../types';

interface Props {
  onSidebarToggle: () => void;
  onNewChat: () => void;
  messages: Message[];
}

export function TopBar({ onSidebarToggle, onNewChat, messages }: Props) {
  const shouldReduce = useReducedMotion();

  return (
    <header
      className="no-print"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
        background: 'color-mix(in srgb, var(--color-bg) 80%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: 56,
      }}
    >
      {/* Left: settings icon + logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          aria-label="Open settings"
          onClick={onSidebarToggle}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            color: 'var(--color-muted)',
            cursor: 'pointer',
            transition: 'color 250ms ease, background 250ms ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text)';
            (e.currentTarget as HTMLButtonElement).style.background =
              'color-mix(in srgb, var(--color-border) 60%, transparent)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted)';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <Settings size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <motion.div
            aria-hidden="true"
            animate={shouldReduce ? {} : { scale: [1, 1.4, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--color-primary)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.15rem',
              color: 'var(--color-text)',
              letterSpacing: '0.02em',
            }}
          >
            Solace
          </span>
        </div>
      </div>

      {/* Right: New Conversation button */}
      <button
        aria-label="New conversation"
        onClick={onNewChat}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 14px',
          borderRadius: 20,
          border: '1px solid var(--color-border)',
          background: 'transparent',
          color: 'var(--color-muted)',
          cursor: messages.length === 0 ? 'default' : 'pointer',
          fontSize: 13,
          fontFamily: 'inherit',
          transition: 'color 250ms ease, border-color 250ms ease, background 250ms ease',
          opacity: messages.length === 0 ? 0.4 : 1,
        }}
        disabled={messages.length === 0}
        onMouseEnter={(e) => {
          if (messages.length === 0) return;
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
          (e.currentTarget as HTMLButtonElement).style.background =
            'color-mix(in srgb, var(--color-primary) 8%, transparent)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        <RotateCcw size={13} />
        New Conversation
      </button>
    </header>
  );
}
