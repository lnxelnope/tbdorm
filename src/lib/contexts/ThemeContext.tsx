"use client";

import { createContext, useContext, useState, useEffect } from 'react';

type ThemeContextType = {
  isMobileMode: boolean;
  toggleMobileMode: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isMobileMode, setIsMobileMode] = useState(false);

  const toggleMobileMode = () => {
    setIsMobileMode(!isMobileMode);
    localStorage.setItem('isMobileMode', (!isMobileMode).toString());
  };

  useEffect(() => {
    const savedMode = localStorage.getItem('isMobileMode');
    if (savedMode !== null) {
      setIsMobileMode(savedMode === 'true');
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ isMobileMode, toggleMobileMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 