import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Moon, Wind, Trash2, MessageSquare, Search } from 'lucide-react';
import { AmbientSoundPopover } from './AmbientSoundPopover';
import { ExportMenu } from './ExportMenu';
import type { Message, Session } from '../types';
import type { FontSizeIndex } from '../hooks/useFontSize';

interface Props {
  open: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onBreathing: () => void;
  messages: Message[];
  sessions: Session[];
  onLoadSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  fontSizeIndex: FontSizeIndex;
  onSetFontSize: (i: FontSizeIndex) => void;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function SidebarRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        border: 'none',
        borderRadius: 10,
        background: 'transparent',
        color: 'var(--color-text)',
        cursor: 'pointer',
        fontSize: 14,
        fontFamily: 'inherit',
        textAlign: 'left',
        transition: 'background 200ms ease',
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background =
          'color-mix(in srgb, var(--color-border) 60%, transparent)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')
      }
    >
      <span style={{ color: 'var(--color-muted)', display: 'flex', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {hint && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--color-muted)',
            background: 'color-mix(in srgb, var(--color-border) 70%, transparent)',
            borderRadius: 4,
            padding: '1px 6px',
            fontFamily: 'monospace',
            opacity: 0.8,
            flexShrink: 0,
          }}
        >
          {hint}
        </span>
      )}
    </button>
  );
}

const FONT_LABELS = ['A−', 'A', 'A+'] as const;

export function Sidebar({
  open,
  onClose,
  theme,
  onToggleTheme,
  onBreathing,
  messages,
  sessions,
  onLoadSession,
  onDeleteSession,
  onRenameSession,
  fontSizeIndex,
  onSetFontSize,
}: Props) {
  const isMobile = useIsMobile();
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const noMessages = messages.length === 0;
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Auto-focus first button when sidebar opens
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const first = drawerRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), input',
      );
      first?.focus();
    }, 320);
    return () => clearTimeout(timer);
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (isMobile && dy > 80) onClose();
    else if (!isMobile && dx < -80) onClose();
  };

  const drawerStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: '80vh',
        borderRadius: '20px 20px 0 0',
        overflowY: 'auto',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
      }
    : {
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 280,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
        overflowY: 'auto',
      };

  const drawerAnimate = isMobile
    ? { y: open ? 0 : '100%' }
    : { x: open ? 0 : -280 };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 19 }}
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={drawerRef}
        initial={false}
        animate={drawerAnimate}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={drawerStyle}
        aria-label="Settings sidebar"
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 16px 12px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Settings
          </span>
          <button
            aria-label="Close settings"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--color-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Settings items */}
        <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <SidebarRow
            icon={theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            label={theme === 'light' ? 'Dark mode' : 'Light mode'}
            onClick={onToggleTheme}
          />
          <SidebarRow
            icon={<Wind size={18} />}
            label="Breathing exercise"
            hint="/"
            onClick={() => { onBreathing(); onClose(); }}
          />
          <AmbientSoundPopover sidebarMode />
          <ExportMenu messages={messages} sidebarMode disabled={noMessages} />

          {/* Font size row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
            }}
          >
            <span style={{ color: 'var(--color-muted)', display: 'flex', flexShrink: 0, fontSize: 15 }}>
              Aa
            </span>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--color-text)' }}>Text size</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {FONT_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => onSetFontSize(i as FontSizeIndex)}
                  aria-label={`Font size ${['small', 'medium', 'large'][i]}`}
                  style={{
                    width: 32,
                    height: 28,
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: fontSizeIndex === i ? 'var(--color-primary)' : 'var(--color-border)',
                    background: fontSizeIndex === i
                      ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                      : 'transparent',
                    color: fontSizeIndex === i ? 'var(--color-primary)' : 'var(--color-muted)',
                    cursor: 'pointer',
                    fontSize: 11 + i * 1.5,
                    fontFamily: 'inherit',
                    fontWeight: fontSizeIndex === i ? 500 : 400,
                    transition: 'all 200ms ease',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* History section — always shown (with empty state) */}
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            flexShrink: 0,
            padding: '4px 16px 8px',
          }}
        >
          <span
            style={{
              display: 'block',
              paddingTop: 12,
              paddingBottom: 8,
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--color-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Past conversations
          </span>

          {/* Search input */}
          {sessions.length > 3 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'color-mix(in srgb, var(--color-border) 40%, transparent)',
                borderRadius: 8,
                padding: '6px 10px',
                marginBottom: 6,
              }}
            >
              <Search size={13} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 13,
                  color: 'var(--color-text)',
                  fontFamily: 'inherit',
                }}
                aria-label="Search past conversations"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ border: 'none', background: 'transparent', color: 'var(--color-muted)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>

        {/* History list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 8px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {sessions.length === 0 ? (
            <p
              style={{
                fontSize: 12,
                color: 'var(--color-muted)',
                padding: '8px 8px',
                opacity: 0.7,
                fontStyle: 'italic',
                margin: 0,
              }}
            >
              Past conversations will appear here.
            </p>
          ) : filteredSessions.length === 0 ? (
            <p
              style={{
                fontSize: 12,
                color: 'var(--color-muted)',
                padding: '8px 8px',
                opacity: 0.7,
                fontStyle: 'italic',
                margin: 0,
              }}
            >
              No conversations match "{searchQuery}".
            </p>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                style={{ display: 'flex', alignItems: 'center', gap: 4, borderRadius: 10, overflow: 'hidden' }}
              >
                <button
                  onClick={() => { onLoadSession(session.id); onClose(); }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderRadius: 10,
                    transition: 'background 200ms ease',
                    minWidth: 0,
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      'color-mix(in srgb, var(--color-border) 60%, transparent)')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')
                  }
                >
                  <MessageSquare
                    size={14}
                    style={{ color: 'var(--color-muted)', flexShrink: 0, marginTop: 2 }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    {editingId === session.id ? (
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => { onRenameSession(session.id, editTitle); setEditingId(null); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { onRenameSession(session.id, editTitle); setEditingId(null); }
                          if (e.key === 'Escape') setEditingId(null);
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        style={{
                          fontSize: 13,
                          color: 'var(--color-text)',
                          background: 'color-mix(in srgb, var(--color-border) 50%, transparent)',
                          border: '1px solid var(--color-primary)',
                          borderRadius: 4,
                          padding: '1px 6px',
                          outline: 'none',
                          fontFamily: 'inherit',
                          width: '100%',
                        }}
                      />
                    ) : (
                      <span
                        title="Double-click to rename"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingId(session.id);
                          setEditTitle(session.title);
                        }}
                        style={{
                          fontSize: 13,
                          color: 'var(--color-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                        }}
                      >
                        {session.title}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                      {formatDate(session.startedAt)}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => onDeleteSession(session.id)}
                  aria-label="Delete conversation"
                  style={{
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-muted)',
                    cursor: 'pointer',
                    borderRadius: 6,
                    opacity: 0.45,
                    transition: 'opacity 200ms ease, color 200ms ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '0.45';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted)';
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
}
