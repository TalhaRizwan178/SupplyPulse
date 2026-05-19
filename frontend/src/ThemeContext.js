import React, { createContext, useContext, useState } from 'react';
import { darkTheme, lightTheme } from './theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('dark');
  const theme = mode === 'dark' ? darkTheme : lightTheme;

  const toggleTheme = () => setMode(m => (m === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
