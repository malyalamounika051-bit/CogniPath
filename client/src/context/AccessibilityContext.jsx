import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext(null);

export function AccessibilityProvider({ children }) {
  const [dyslexicFont, setDyslexicFont] = useState(() => {
    return localStorage.getItem('cp_dyslexic_font') === 'true';
  });

  const [readingFocusMode, setReadingFocusMode] = useState(() => {
    return localStorage.getItem('cp_reading_focus') === 'true';
  });

  const [fontScale, setFontScale] = useState(() => {
    return parseFloat(localStorage.getItem('cp_font_scale')) || 1.0;
  });

  useEffect(() => {
    if (dyslexicFont) {
      document.body.classList.add('font-dyslexic');
    } else {
      document.body.classList.remove('font-dyslexic');
    }
    localStorage.setItem('cp_dyslexic_font', dyslexicFont);
  }, [dyslexicFont]);

  useEffect(() => {
    if (readingFocusMode) {
      document.body.classList.add('reading-focus-active');
    } else {
      document.body.classList.remove('reading-focus-active');
    }
    localStorage.setItem('cp_reading_focus', readingFocusMode);
  }, [readingFocusMode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', `${fontScale}rem`);
    localStorage.setItem('cp_font_scale', fontScale);
  }, [fontScale]);

  const toggleDyslexicFont = () => setDyslexicFont((prev) => !prev);
  const toggleReadingFocus = () => setReadingFocusMode((prev) => !prev);
  const increaseFont = () => setFontScale((prev) => Math.min(prev + 0.1, 1.4));
  const decreaseFont = () => setFontScale((prev) => Math.max(prev - 0.1, 0.9));
  const resetFont = () => setFontScale(1.0);

  return (
    <AccessibilityContext.Provider
      value={{
        dyslexicFont,
        toggleDyslexicFont,
        readingFocusMode,
        toggleReadingFocus,
        fontScale,
        increaseFont,
        decreaseFont,
        resetFont,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
