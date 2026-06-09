import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('solace.theme') as Theme | null;
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('solace.theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    // Add transitioning class, remove after animations complete
    document.documentElement.classList.add('theme-transitioning');
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 350);
  };

  return { theme, toggleTheme };
}
