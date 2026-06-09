import { motion } from 'framer-motion';
import { getEmotionColors } from '../lib/emotionPalette';

interface Props {
  emotion: string;
}

export function EmotionBackground({ emotion }: Props) {
  const colors = getEmotionColors(emotion);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <motion.div
        animate={{ backgroundColor: colors.blob1 }}
        transition={{ duration: 2, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          filter: 'blur(120px)',
          opacity: 0.35,
          top: '-20%',
          left: '-10%',
        }}
      />
      <motion.div
        animate={{ backgroundColor: colors.blob2 }}
        transition={{ duration: 2, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          filter: 'blur(120px)',
          opacity: 0.3,
          bottom: '-15%',
          right: '-5%',
        }}
      />
      <motion.div
        animate={{ backgroundColor: colors.blob1 }}
        transition={{ duration: 2.5, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          filter: 'blur(100px)',
          opacity: 0.2,
          top: '40%',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
    </div>
  );
}
