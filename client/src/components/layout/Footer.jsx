import React from 'react';
import { Brain, Heart, ShieldCheck, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-md mt-20 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-950 via-slate-900 to-blue-900 flex items-center justify-center text-white shadow-md shadow-indigo-950/20">
              <Brain className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-slate-900 tracking-tight">CogniPath</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-800 border border-amber-400/30">
                  AI Copilot
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                The Adaptive Student Intelligence Copilot — AI for Accessibility & Inclusion
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 font-semibold">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Privacy-First & Student Controlled
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <Sparkles className="w-4 h-4 text-amber-500" />
              WCAG 2.2 AA Accessible
            </span>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3 font-medium">
          <p>© {new Date().getFullYear()} CogniPath. Built with the 60-30-10 color principle for focused, distraction-free learning.</p>
          <p>Educational tool • Pacing & comprehension aid</p>
        </div>
      </div>
    </footer>
  );
}
