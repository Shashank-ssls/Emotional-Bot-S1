import { motion, useReducedMotion } from 'framer-motion';
import type { StreamStatus } from '../types';

interface Props {
  size?: number;
  status?: StreamStatus;
  mini?: boolean;
}

export function Orb({ size = 120, status = 'idle', mini = false }: Props) {
  const shouldReduce = useReducedMotion();

  if (mini) {
    return (
      <div
        aria-hidden="true"
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 40%, var(--color-primary), transparent 70%)',
          flexShrink: 0,
          opacity: 0.85,
        }}
      />
    );
  }

  const isThinking = status === 'thinking';
  const isTyping = status === 'typing_reflection';

  const breathDuration = isThinking ? 1.5 : 5;
  const breathScale = isThinking ? [1, 1.1, 1] : [1, 1.06, 1];
  const opacityAnim = isTyping ? [0.85, 1, 0.85] : isThinking ? [0.9, 1, 0.9] : [1];

  return (
    <motion.div
      aria-hidden="true"
      animate={
        shouldReduce
          ? {}
          : {
              scale: breathScale,
              opacity: opacityAnim,
            }
      }
      transition={
        shouldReduce
          ? {}
          : {
              duration: breathDuration,
              repeat: Infinity,
              ease: 'easeInOut',
            }
      }
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `
          radial-gradient(circle at 35% 35%,
            color-mix(in srgb, var(--color-primary) 60%, white) 0%,
            var(--color-primary) 35%,
            color-mix(in srgb, var(--color-primary) 40%, var(--color-bot-bubble)) 65%,
            transparent 100%
          )
        `,
        boxShadow: `0 0 ${isThinking ? 40 : 24}px color-mix(in srgb, var(--color-primary) 40%, transparent)`,
        flexShrink: 0,
        transition: 'box-shadow 500ms ease',
      }}
    />
  );
}
