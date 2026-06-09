import { useState, useEffect, useRef, useCallback } from 'react';
import { postChat, postChatStream } from '../lib/api';
import type { Message, StreamStatus, ChatResponse, SSEEvent, Session } from '../types';

function errorText(status?: number): string {
  if (status === 422) return "I couldn't quite read that — could you try sending it again?";
  if (status === 429) return "Let's slow down together. Try again in a few seconds.";
  return "Something went quiet on my end. Could you try once more?";
}

function makeErrorMessage(text: string): Message {
  return { role: 'assistant', content: JSON.stringify({ __error: true, text }), timestamp: Date.now() };
}

// Extract the partial persona_opener value from a streaming JSON fragment
function extractOpener(raw: string): string {
  const m = raw.match(/"persona_opener"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!m) return '';
  return m[1]
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem('solace.conversation');
      return stored ? (JSON.parse(stored) as Message[]) : [];
    } catch {
      return [];
    }
  });

  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('solace.history') ?? '[]') as Session[];
    } catch {
      return [];
    }
  });

  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [partialText, setPartialText] = useState('');
  const [currentEmotion, setCurrentEmotion] = useState('calm');
  const abortRef = useRef<AbortController | null>(null);
  const chunksRef = useRef('');

  const isStreaming = streamStatus !== 'idle' && streamStatus !== 'done';

  useEffect(() => {
    localStorage.setItem('solace.conversation', JSON.stringify(messages));
  }, [messages]);

  const saveCurrentToHistory = useCallback((msgs: Message[]) => {
    if (msgs.length === 0) return;
    const firstUserMsg = msgs.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 45) + (firstUserMsg.content.length > 45 ? '…' : '')
      : 'Conversation';
    const session: Session = {
      id: crypto.randomUUID(),
      startedAt: msgs[0]?.timestamp ?? Date.now(),
      title,
      messages: msgs,
    };
    setSessions((prev) => {
      const updated = [session, ...prev].slice(0, 20);
      localStorage.setItem('solace.history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Core stream runner — shared by sendMessage and retryLastError
  const runStream = useCallback(
    async (text: string, historyForApi: Message[]) => {
      setPartialText('');
      setStreamStatus('thinking');
      chunksRef.current = '';
      abortRef.current = new AbortController();

      try {
        let finalResponse: ChatResponse | null = null;

        await postChatStream(
          text,
          historyForApi,
          (event: SSEEvent) => {
            if (event.status === 'thinking') {
              setStreamStatus('thinking');
            } else if (event.status === 'typing_chunk' && event.text) {
              chunksRef.current += event.text;
              const opener = extractOpener(chunksRef.current);
              if (opener) {
                setStreamStatus('typing_reflection');
                setPartialText(opener);
              }
            } else if (event.status === 'complete' && event.response) {
              finalResponse = event.response;
              setStreamStatus('complete');
              setCurrentEmotion(event.response.emotion.primary);
            } else if (event.status === 'done') {
              setStreamStatus('idle');
            }
          },
          abortRef.current.signal,
        );

        if (finalResponse) {
          const assistantMsg: Message = {
            role: 'assistant',
            content: JSON.stringify(finalResponse),
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;

        if ((err as { name?: string }).name === 'AbortError') {
          setStreamStatus('idle');
          return;
        }

        try {
          const fallback = await postChat(text, historyForApi);
          setCurrentEmotion(fallback.emotion.primary);
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: JSON.stringify(fallback), timestamp: Date.now() },
          ]);
        } catch (fallbackErr: unknown) {
          const fallbackStatus = (fallbackErr as { status?: number }).status ?? status;
          setMessages((prev) => [...prev, makeErrorMessage(errorText(fallbackStatus))]);
        }
      } finally {
        setStreamStatus('idle');
        setPartialText('');
        chunksRef.current = '';
      }
    },
    [],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (isStreaming) return;
      const userMsg: Message = { role: 'user', content: text, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      await runStream(text, messages);
    },
    [messages, isStreaming, runStream],
  );

  const retryLastError = useCallback(async () => {
    if (isStreaming) return;
    const snapshot = messages;
    const lastMsg = snapshot[snapshot.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant') return;

    try {
      const parsed = JSON.parse(lastMsg.content);
      if (!parsed.__error) return;
    } catch {
      return;
    }

    const lastUser = snapshot.slice(0, -1).reverse().find((m) => m.role === 'user');
    if (!lastUser) return;

    const withoutError = snapshot.slice(0, -1);
    const historyBeforeUser = snapshot.slice(0, -2);

    setMessages(withoutError);
    await runStream(lastUser.content, historyBeforeUser);
  }, [messages, isStreaming, runStream]);

  const startNewConversation = useCallback(() => {
    abortRef.current?.abort();
    saveCurrentToHistory(messages);
    setMessages([]);
    setStreamStatus('idle');
    setPartialText('');
    setCurrentEmotion('calm');
    chunksRef.current = '';
    localStorage.removeItem('solace.conversation');
  }, [messages, saveCurrentToHistory]);

  const loadSession = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;
      abortRef.current?.abort();
      saveCurrentToHistory(messages);
      setMessages(session.messages);
      setSessions((prev) => {
        const updated = prev.filter((s) => s.id !== sessionId);
        localStorage.setItem('solace.history', JSON.stringify(updated));
        return updated;
      });
      setStreamStatus('idle');
      setPartialText('');
      chunksRef.current = '';
      const lastAssistant = [...session.messages].reverse().find((m) => m.role === 'assistant');
      if (lastAssistant) {
        try {
          const r = JSON.parse(lastAssistant.content) as ChatResponse;
          setCurrentEmotion(r.emotion.primary);
        } catch {
          // ignore
        }
      }
    },
    [sessions, messages, saveCurrentToHistory],
  );

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      localStorage.setItem('solace.history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setSessions((prev) => {
      const updated = prev.map((s) => s.id === sessionId ? { ...s, title: trimmed } : s);
      localStorage.setItem('solace.history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
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
  };
}
