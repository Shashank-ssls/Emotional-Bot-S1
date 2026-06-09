import type { Message, ChatResponse, SSEEvent } from '../types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export async function postChat(message: string, history: Message[]): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok) {
    throw Object.assign(new Error('chat failed'), { status: res.status });
  }

  return res.json() as Promise<ChatResponse>;
}

export async function postChatStream(
  message: string,
  history: Message[],
  onEvent: (event: SSEEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
    signal,
  });

  if (!res.ok) {
    throw Object.assign(new Error('stream failed'), { status: res.status });
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('no body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith('data:')) continue;
      const json = line.slice(5).trim();
      if (!json) continue;
      try {
        const event = JSON.parse(json) as SSEEvent;
        onEvent(event);
      } catch {
        // skip malformed chunks
      }
    }
  }
}
