import React from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { Type, Eye, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function DyslexiaToolbar() {
  const {
    dyslexicFont,
    toggleDyslexicFont,
    readingFocusMode,
    toggleReadingFocus,
    fontScale,
    increaseFont,
    decreaseFont,
    resetFont,
  } = useAccessibility();

  return (
    <div
      role="region"
      aria-label="Accessibility and Reading Controls"
      className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 shadow-sm flex flex-wrap items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200"
    >
      <span className="text-slate-400 font-semibold tracking-wide uppercase text-[10px] mr-1">
        Readability:
      </span>

      <button
        onClick={toggleDyslexicFont}
        aria-pressed={dyslexicFont}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
          dyslexicFont
            ? 'bg-sky-50 border-sky-300 text-sky-800 font-bold'
            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
        }`}
        title="Toggle Dyslexia-friendly high-legibility font style"
      >
        <Type className="w-3.5 h-3.5 text-sky-600" />
        <span>Dyslexia Font {dyslexicFont ? 'On' : 'Off'}</span>
      </button>

      <button
        onClick={toggleReadingFocus}
        aria-pressed={readingFocusMode}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
          readingFocusMode
            ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
        }`}
        title="Warm tint background for reduced glare and eye strain"
      >
        <Eye className="w-3.5 h-3.5 text-amber-600" />
        <span>Reading Tint {readingFocusMode ? 'On' : 'Off'}</span>
      </button>

      <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

      <div className="flex items-center gap-1">
        <button
          onClick={decreaseFont}
          disabled={fontScale <= 0.9}
          className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
          title="Decrease text size"
          aria-label="Decrease text size"
        >
          <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
        </button>
        <span className="px-1 text-slate-500 min-w-10 text-center font-mono">
          {Math.round(fontScale * 100)}%
        </span>
        <button
          onClick={increaseFont}
          disabled={fontScale >= 1.4}
          className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
          title="Increase text size"
          aria-label="Increase text size"
        >
          <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
        </button>
        {fontScale !== 1.0 && (
          <button
            onClick={resetFont}
            className="p-1.5 rounded text-slate-400 hover:text-slate-700"
            title="Reset font scale to 100%"
            aria-label="Reset font scale"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
