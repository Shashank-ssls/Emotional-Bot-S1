import { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Phase = 'inhale' | 'hold' | 'exhale' | 'done';

const PHASES: { phase: Phase; duration: number; label: string }[] = [
  { phase: 'inhale', duration: 4, label: 'Breathe in...' },
  { phase: 'hold', duration: 7, label: 'Hold' },
  { phase: 'exhale', duration: 8, label: 'Release' },
];

const DEFAULT_CYCLES = 4;

export function BreathingOverlay({ open, onClose }: Props) {
  const shouldReduce = useReducedMotion();
  const [cycle, setCycle] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PHASES[0].duration);
  const [finished, setFinished] = useState(false);
  const [maxCycles, setMaxCycles] = useState(DEFAULT_CYCLES);

  const reset = useCallback((cycles = DEFAULT_CYCLES) => {
    setCycle(0);
    setPhaseIndex(0);
    setTimeLeft(PHASES[0].duration);
    setFinished(false);
    setMaxCycles(cycles);
  }, []);

  useEffect(() => {
    if (!open) { reset(); return; }
    if (finished) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          const nextPhaseIndex = phaseIndex + 1;
          if (nextPhaseIndex >= PHASES.length) {
            const nextCycle = cycle + 1;
            if (nextCycle >= maxCycles) {
              setFinished(true);
              clearInterval(timer);
              return 0;
            }
            setCycle(nextCycle);
            setPhaseIndex(0);
            return PHASES[0].duration;
          }
          setPhaseIndex(nextPhaseIndex);
          return PHASES[nextPhaseIndex].duration;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, phaseIndex, cycle, finished, maxCycles, reset]);

  const currentPhase = PHASES[phaseIndex];
  const orbScale = currentPhase.phase === 'inhale' ? 1.8 : currentPhase.phase === 'hold' ? 1.8 : 1;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'color-mix(in srgb, var(--color-bg) 85%, transparent)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Dialog.Content
            aria-label="Breathing exercise"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              padding: '28px 40px 40px',
              outline: 'none',
              width: 420,
              maxWidth: '94vw',
              background: 'color-mix(in srgb, var(--color-surface) 80%, transparent)',
              borderRadius: 24,
              border: '1px solid var(--color-border)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.1)',
            }}
          >
            {/* Header row: title + close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Dialog.Title
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.1rem',
                  color: 'var(--color-muted)',
                  fontStyle: 'italic',
                  margin: 0,
                }}
              >
                4 – 7 – 8 breathing
              </Dialog.Title>

              <Dialog.Close asChild>
                <button
                  aria-label="Close breathing exercise"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'transparent',
                    color: 'var(--color-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            {!finished ? (
              <>
                {/* Fixed-size container prevents scale animation from pushing adjacent text */}
                <div
                  style={{
                    width: 300,
                    height: 300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <motion.div
                    animate={shouldReduce ? {} : { scale: orbScale }}
                    transition={{
                      duration: currentPhase.duration,
                      ease:
                        currentPhase.phase === 'inhale'
                          ? 'easeIn'
                          : currentPhase.phase === 'exhale'
                          ? 'easeOut'
                          : 'linear',
                    }}
                    style={{
                      width: 160,
                      height: 160,
                      borderRadius: '50%',
                      background: `radial-gradient(circle at 35% 35%,
                        color-mix(in srgb, var(--color-secondary) 60%, white) 0%,
                        var(--color-secondary) 40%,
                        color-mix(in srgb, var(--color-secondary) 30%, var(--color-bg)) 70%,
                        transparent 100%
                      )`,
                      boxShadow:
                        '0 0 48px color-mix(in srgb, var(--color-secondary) 30%, transparent)',
                    }}
                  />
                </div>

                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentPhase.label}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.5rem',
                      fontStyle: 'italic',
                      color: 'var(--color-text)',
                      margin: 0,
                    }}
                  >
                    {currentPhase.label}
                  </motion.p>
                </AnimatePresence>

                <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: 0 }}>
                  {timeLeft}s — cycle {cycle + 1} of {maxCycles}
                </p>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}
              >
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontStyle: 'italic', color: 'var(--color-text)', margin: 0 }}>
                  Take one more if you'd like
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => reset(DEFAULT_CYCLES + 1)}
                    style={{
                      padding: '10px 24px',
                      borderRadius: 24,
                      border: '1px solid var(--color-secondary)',
                      background: 'transparent',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    One more
                  </button>
                  <button
                    onClick={onClose}
                    style={{
                      padding: '10px 24px',
                      borderRadius: 24,
                      border: 'none',
                      background: 'var(--color-secondary)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    I'm done
                  </button>
                </div>
              </motion.div>
            )}

            <p style={{ fontSize: 11, color: 'var(--color-muted)', opacity: 0.6, margin: 0 }}>
              Press ESC to close
            </p>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
