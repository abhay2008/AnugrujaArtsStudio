'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

/** `compact` drops the 44px hit area for the tight mobile header cluster. */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`theme-toggle flex items-center justify-center rounded-xl transition-all active:scale-95 ${
        compact ? 'h-8 w-8' : 'touch-target min-w-[40px] min-h-[40px]'
      }`}
    >
      {!mounted ? (
        <span className="w-4 h-4 rounded-full bg-current opacity-30" aria-hidden />
      ) : theme === 'dark' ? (
        <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} />
      ) : (
        <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      )}
    </button>
  );
}
