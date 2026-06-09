import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { Message, ChatResponse, TrendDirection } from '../types';

const VALENCE: Record<TrendDirection, number> = {
  improving: 0.8,
  stable: 0.5,
  fluctuating: 0.5,
  worsening: 0.25,
};

interface DataPoint {
  valence: number;
  note: string;
  direction: TrendDirection;
}

interface Props {
  open: boolean;
  onClose: () => void;
  messages: Message[];
}

export function MoodSparklineModal({ open, onClose, messages }: Props) {
  const dataPoints: DataPoint[] = [];

  messages.forEach((m) => {
    if (m.role !== 'assistant') return;
    try {
      const r = JSON.parse(m.content) as ChatResponse;
      if (r.mood_trend) {
        dataPoints.push({
          valence: VALENCE[r.mood_trend.direction] ?? 0.5,
          note: r.mood_trend.note,
          direction: r.mood_trend.direction,
        });
      }
    } catch {
      // skip
    }
  });

  const recent = dataPoints.slice(-10);
  const W = 280;
  const H = 80;
  const pad = 10;

  const toX = (i: number) =>
    recent.length < 2 ? W / 2 : pad + (i / (recent.length - 1)) * (W - pad * 2);
  const toY = (v: number) => H - pad - v * (H - pad * 2);

  const pathD =
    recent.length >= 2
      ? recent.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.valence)}`).join(' ')
      : '';

  const TREND_COLOR: Record<TrendDirection, string> = {
    improving: '#8AA88A',
    stable: '#D4A85A',
    fluctuating: 'hsl(270,30%,65%)',
    worsening: '#C98B7A',
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Dialog.Content
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 20,
              padding: 28,
              maxWidth: 380,
              width: '92vw',
              outline: 'none',
              position: 'relative',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <Dialog.Close asChild>
              <button
                aria-label="Close mood chart"
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </Dialog.Close>

            <Dialog.Title
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1rem',
                fontStyle: 'italic',
                color: 'var(--color-text)',
                marginBottom: 20,
                marginTop: 0,
              }}
            >
              Mood over time
            </Dialog.Title>

            {recent.length < 2 ? (
              <p style={{ fontSize: 13, color: 'var(--color-muted)', textAlign: 'center', padding: '20px 0', margin: 0 }}>
                Not enough data yet — keep the conversation going.
              </p>
            ) : (
              <>
                <svg
                  width={W}
                  height={H}
                  aria-label="Mood sparkline"
                  style={{ display: 'block', margin: '0 auto' }}
                >
                  {/* Axis line */}
                  <line
                    x1={pad}
                    y1={toY(0.5)}
                    x2={W - pad}
                    y2={toY(0.5)}
                    stroke="var(--color-border)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke="var(--color-secondary)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {recent.map((p, i) => (
                    <circle
                      key={i}
                      cx={toX(i)}
                      cy={toY(p.valence)}
                      r={4}
                      fill={TREND_COLOR[p.direction]}
                      opacity={0.9}
                    >
                      <title>{p.note}</title>
                    </circle>
                  ))}
                </svg>

                {/* Notes list */}
                <div
                  style={{
                    marginTop: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {recent.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        fontSize: 12,
                        color: 'var(--color-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: TREND_COLOR[p.direction],
                          flexShrink: 0,
                          marginTop: 3,
                        }}
                      />
                      {p.note}
                    </div>
                  ))}
                </div>
              </>
            )}

            <p style={{ fontSize: 11, color: 'var(--color-muted)', textAlign: 'center', marginTop: 16, marginBottom: 0, opacity: 0.6 }}>
              Last {recent.length} check-in{recent.length !== 1 ? 's' : ''}
            </p>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
