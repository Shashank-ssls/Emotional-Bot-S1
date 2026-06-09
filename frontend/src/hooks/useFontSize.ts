import { useState, useEffect } from 'react';

const SIZES = [13, 15, 17] as const;
const LABELS = ['Small', 'Medium', 'Large'] as const;

export type FontSizeIndex = 0 | 1 | 2;

export function useFontSize() {
  const [index, setIndex] = useState<FontSizeIndex>(() => {
    const stored = parseInt(localStorage.getItem('solace.fontSizeIndex') ?? '1');
    return (Math.min(Math.max(stored, 0), 2) as FontSizeIndex);
  });

  useEffect(() => {
    localStorage.setItem('solace.fontSizeIndex', String(index));
  }, [index]);

  return {
    fontSizeIndex: index,
    fontSize: SIZES[index],
    fontSizeLabel: LABELS[index],
    setFontSizeIndex: setIndex,
    SIZES,
    LABELS,
  };
}
