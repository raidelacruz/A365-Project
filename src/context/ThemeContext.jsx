import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

function initialTheme() {
  try {
    const saved = localStorage.getItem('a365_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* El tema sigue funcionando si el navegador bloquea el almacenamiento. */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.bsTheme = theme;
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('a365_theme', theme); } catch { /* Preferencia temporal. */ }
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme(value => value === 'dark' ? 'light' : 'dark') }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
