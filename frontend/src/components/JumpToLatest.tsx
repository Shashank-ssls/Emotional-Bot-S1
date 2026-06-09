import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

interface Props {
  show: boolean;
  onClick: () => void;
}

export function JumpToLatest({ show, onClick }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.9 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={onClick}
          aria-label="Jump to latest message"
          style={{
            position: 'fixed',
            bottom: 90,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 18px',
            borderRadius: 24,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-muted)',
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap',
          }}
        >
          <ArrowDown size={14} />
          Jump to latest
        </motion.button>
      )}
    </AnimatePresence>
  );
}
