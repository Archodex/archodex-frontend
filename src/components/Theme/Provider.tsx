import React, { useEffect, useState } from 'react';
import ThemeContext, { Theme } from './Context';
import posthog from 'posthog-js';

declare global {
  interface Window {
    setSessionTheme: (theme: Theme) => void;
  }
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}) => {
  const [theme, setTheme] = useState<Theme>(
    () =>
      (sessionStorage.getItem(storageKey) as Theme | null) ??
      (localStorage.getItem(storageKey) as Theme | null) ??
      defaultTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const systemTheme = mediaQuery.matches ? 'dark' : 'light';

      root.classList.add(systemTheme);

      posthog.capture('theme_applied', { theme, systemTheme });

      mediaQuery.addEventListener('change', () => {
        const newTheme = mediaQuery.matches ? 'dark' : 'light';
        root.classList.remove('light', 'dark');
        root.classList.add(newTheme);

        posthog.capture('system_theme_changed', { newTheme });
      });
    } else {
      posthog.capture('theme_applied', { theme });

      root.classList.add(theme);
    }
  }, [theme]);

  window.setSessionTheme = (theme?: Theme) => {
    if (theme) {
      sessionStorage.setItem(storageKey, theme);
      setTheme(theme);
    } else {
      sessionStorage.removeItem(storageKey);
      setTheme(defaultTheme);
    }
  };

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeContext.Provider {...props} value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
