import { createContext } from 'react';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeState = { theme: 'system', setTheme: () => null };

const ThemeContext = createContext<ThemeState>(initialState);

export default ThemeContext;
