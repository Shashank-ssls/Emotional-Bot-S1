import { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useChat } from './hooks/useChat';
import { useTheme } from './hooks/useTheme';
import { useFontSize } from './hooks/useFontSize';
import { EmotionBackground } from './components/EmotionBackground';
import { Orb } from './components/Orb';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { ChatInput } from './components/ChatInput';
import { ChatMessage, TypingIndicator } from './components/ChatMessage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { JumpToLatest } from './components/JumpToLatest';
import type { ChatResponse } from './types';
import type { FontSizeIndex } from './hooks/useFontSize';

const BreathingOverlay = lazy(() =>
  import('./components/BreathingOverlay').then((m) => ({ default: m.BreathingOverlay })),
);

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { fontSize, fontSizeIndex, setFontSizeIndex } = useFontSize();
  const {
    messages,
    sessions,
    isStreaming,
    streamStatus,
    partialText,
    currentEmotion,
    sendMessage,
    retryLastError,
    startNewConversation,
    loadSession,
    deleteSession,
    renameSession,
    cancelStream,
  } = useChat();

  const [breathingOpen, setBreathingOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newChatPending, setNewChatPending] = useState(false);
  const [showJump, setShowJump] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const hasMessages = messages.length > 0;

  // Trap focus in sidebar when open
  useEffect(() => {
    if (!mainContentRef.current) return;
    if (sidebarOpen) {
      mainContentRef.current.setAttribute('inert', '');
    } else {
      mainContentRef.current.removeAttribute('inert');
    }
  }, [sidebarOpen]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowJump(false);
  }, []);

  const getDistFromBottom = (container: HTMLDivElement) =>
    container.scrollHeight - container.scrollTop - container.clientHeight;

  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setShowJump(getDistFromBottom(container) > 200);
  }, []);

  // Auto-scroll when near bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (getDistFromBottom(container) < 120) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setShowJump(false);
    }
  }, [messages, partialText]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', checkScrollPosition, { passive: true });
    return () => container.removeEventListener('scroll', checkScrollPosition);
  }, [checkScrollPosition]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        setBreathingOpen((o) => !o);
      }
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleNewChat = () => {
    if (messages.length === 0) return;
    setNewChatPending(true);
  };

  const confirmNewChat = () => {
    startNewConversation();
    setNewChatPending(false);
  };

  // Scroll to top when loading a past session
  const handleLoadSession = useCallback(
    (id: string) => {
      loadSession(id);
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 60);
    },
    [loadSession],
  );

  // Determine if the last message is a retryable error
  const canRetryLast =
    !isStreaming &&
    messages.length > 0 &&
    (() => {
      const last = messages[messages.length - 1];
      if (last?.role !== 'assistant') return false;
      try {
        return !!(JSON.parse(last.content).__error);
      } catch {
        return false;
      }
    })();

  const showTypingIndicator = streamStatus === 'thinking';
  const showPartialCard =
    (streamStatus === 'typing_reflection' || streamStatus === 'complete') && partialText;

  const partialFakeResponse: ChatResponse = {
    persona_opener: partialText,
    emotion: { primary: currentEmotion, secondary: null, confidence: 'medium' },
    reflection: '',
    needs_clarification: false,
    clarifying_question: null,
    suggestions: [],
    follow_up: '',
    disclaimer: '',
    mood_trend: null,
  };

  return (
    <>
      <EmotionBackground emotion={currentEmotion} />

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onBreathing={() => setBreathingOpen(true)}
        messages={messages}
        sessions={sessions}
        onLoadSession={handleLoadSession}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        fontSizeIndex={fontSizeIndex}
        onSetFontSize={(i: FontSizeIndex) => setFontSizeIndex(i)}
      />

      {/* Main content — inert when sidebar open for focus management */}
      <div
        ref={mainContentRef}
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <TopBar
          onSidebarToggle={() => setSidebarOpen((o) => !o)}
          onNewChat={handleNewChat}
          messages={messages}
        />

        {/* Visually-hidden live region for screen readers */}
        <div
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}
        >
          {streamStatus === 'thinking' ? 'Solace is responding…' : ''}
        </div>

        {/* Conversation zone — font size scaling applied here */}
        <div
          ref={scrollContainerRef}
          style={{ flex: 1, overflowY: 'auto', padding: '0 24px', fontSize: `${fontSize}px` }}
        >
          <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 16 }}>

            {/* Welcome state */}
            {!hasMessages && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 'calc(100vh - 180px)',
                  gap: 20,
                  textAlign: 'center',
                }}
              >
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '2.2rem',
                    fontStyle: 'italic',
                    color: 'var(--color-text)',
                    margin: 0,
                    letterSpacing: '0.03em',
                  }}
                >
                  Solace
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                >
                  <Orb size={120} status={streamStatus} />
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.25 }}
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.15rem',
                    fontStyle: 'italic',
                    color: 'var(--color-muted)',
                    lineHeight: 1.6,
                    maxWidth: 340,
                    margin: 0,
                  }}
                >
                  Hello. I'm here whenever you're ready. Take your time.
                </motion.p>
              </div>
            )}

            {/* Message list */}
            {hasMessages && (
              <div style={{ paddingTop: 24 }}>
                <motion.div layout style={{ marginBottom: 20 }}>
                  <Orb size={48} status={streamStatus} />
                </motion.div>

                <div
                  aria-live="polite"
                  aria-label="Conversation"
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  <ErrorBoundary>
                    <AnimatePresence initial={false}>
                      {messages.map((msg, i) => (
                        <ChatMessage
                          key={i}
                          message={msg}
                          messages={messages}
                          onRetry={
                            i === messages.length - 1 && canRetryLast
                              ? retryLastError
                              : undefined
                          }
                        />
                      ))}
                    </AnimatePresence>
                  </ErrorBoundary>

                  {/* Typing indicator and partial card — AnimatePresence for smooth crossfade */}
                  <AnimatePresence mode="sync">
                    {showTypingIndicator && <TypingIndicator key="typing" />}
                    {showPartialCard && (
                      <ChatMessage
                        key="partial"
                        message={{
                          role: 'assistant',
                          content: JSON.stringify(partialFakeResponse),
                        }}
                        isPartial
                        partialText={partialText}
                        messages={messages}
                      />
                    )}
                  </AnimatePresence>
                </div>

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        <ChatInput
          onSend={sendMessage}
          onBreathingOpen={() => setBreathingOpen((o) => !o)}
          onCancel={cancelStream}
          disabled={isStreaming}
        />
      </div>

      {/* Jump to latest pill */}
      <JumpToLatest show={showJump && hasMessages} onClick={scrollToBottom} />

      {/* Breathing overlay */}
      <Suspense fallback={null}>
        <BreathingOverlay open={breathingOpen} onClose={() => setBreathingOpen(false)} />
      </Suspense>

      {/* New conversation confirm */}
      <AnimatePresence>
        {newChatPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 90,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
            onClick={() => setNewChatPending(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 20,
                padding: 28,
                maxWidth: 360,
                width: '100%',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: '1.1rem',
                  color: 'var(--color-text)',
                  marginBottom: 24,
                  marginTop: 0,
                }}
              >
                Start a fresh conversation? This one will be saved to history.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={() => setNewChatPending(false)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 24,
                    border: '1px solid var(--color-border)',
                    background: 'transparent',
                    color: 'var(--color-muted)',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Keep going
                </button>
                <button
                  onClick={confirmNewChat}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 24,
                    border: 'none',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Start fresh
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
