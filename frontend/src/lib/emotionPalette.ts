interface EmotionColors {
  blob1: string;
  blob2: string;
}

const EMOTION_MAP: Array<{ keywords: string[]; colors: EmotionColors }> = [
  {
    keywords: ['anxiety', 'anxious', 'overwhelm', 'overwhelmed', 'stress', 'stressed'],
    colors: { blob1: 'hsl(260,40%,80%)', blob2: 'hsl(38,50%,92%)' },
  },
  {
    keywords: ['sadness', 'sad', 'grief', 'grieving', 'lonely', 'loneliness', 'loss'],
    colors: { blob1: 'hsl(215,35%,72%)', blob2: 'hsl(10,40%,85%)' },
  },
  {
    keywords: ['anger', 'angry', 'frustration', 'frustrated', 'irritated', 'irritation'],
    colors: { blob1: 'hsl(20,45%,70%)', blob2: 'hsl(345,30%,80%)' },
  },
  {
    keywords: ['fear', 'fearful', 'worry', 'worried', 'scared', 'dread'],
    colors: { blob1: 'hsl(230,40%,78%)', blob2: 'hsl(42,35%,85%)' },
  },
  {
    keywords: ['joy', 'joyful', 'relief', 'relieved', 'hope', 'hopeful', 'gratitude', 'grateful', 'happy', 'happiness'],
    colors: { blob1: 'hsl(40,60%,75%)', blob2: 'hsl(22,50%,85%)' },
  },
  {
    keywords: ['shame', 'ashamed', 'guilt', 'guilty', 'embarrassed', 'embarrassment'],
    colors: { blob1: 'hsl(300,20%,72%)', blob2: 'hsl(38,50%,92%)' },
  },
  {
    keywords: ['calm', 'content', 'contentment', 'peaceful', 'peace', 'neutral', 'okay', 'fine'],
    colors: { blob1: 'hsl(130,25%,72%)', blob2: 'hsl(38,50%,92%)' },
  },
  {
    keywords: ['confusion', 'confused', 'uncertainty', 'uncertain', 'unsure', 'lost'],
    colors: { blob1: 'hsl(270,30%,80%)', blob2: 'hsl(42,35%,85%)' },
  },
];

const DEFAULT_COLORS: EmotionColors = { blob1: 'hsl(130,25%,72%)', blob2: 'hsl(38,50%,92%)' };

export function getEmotionColors(primary: string): EmotionColors {
  const lower = primary.toLowerCase();
  for (const entry of EMOTION_MAP) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      return entry.colors;
    }
  }
  return DEFAULT_COLORS;
}
