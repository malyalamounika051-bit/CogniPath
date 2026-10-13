import React, { useState } from 'react';
import { api } from '../../services/api';
import FocusTimer from '../../components/common/FocusTimer';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Sparkles,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function FocusCardsPage() {
  const [inputText, setInputText] = useState('');
  const [title, setTitle] = useState('');
  const [cardCount, setCardCount] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [collection, setCollection] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState([]);
  const [zenMode, setZenMode] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setError('Please paste study material or lecture notes.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.createFocusCards(inputText, cardCount, 'beginner', title);
      setCollection(data);
      setCurrentIndex(0);
      setCompletedIds([]);
    } catch (err) {
      setError(err.message || 'Failed to divide content into focus cards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (cardId) => {
    const isCompleted = completedIds.includes(cardId);
    const newCompleted = isCompleted
      ? completedIds.filter((id) => id !== cardId)
      : [...completedIds, cardId];

    setCompletedIds(newCompleted);

    if (collection?.id) {
      try {
        await api.updateFocusCardsProgress(collection.id, newCompleted);
      } catch (err) {
        console.warn('Failed to sync card progress to server:', err);
      }
    }
  };

  const cards = collection?.cards || [];
  const currentCard = cards[currentIndex] || null;
  const progressPercent = cards.length > 0 ? Math.round((completedIds.length / cards.length) * 100) : 0;

  return (
    <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 ${zenMode ? 'max-w-4xl' : ''}`}>
      {/* Header */}
      {!zenMode && (
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 text-xs font-bold tracking-wide uppercase mb-3 shadow-xs">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Smart Focus Cards & Reader</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Divide Complex Topics into <span className="bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-800 bg-clip-text text-transparent">Bite-Sized Focus Units</span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
            Turn dense chapters, multi-page lecture notes, or abstract concepts into small, comfortable focus cards with distraction-free timer and self-checks.
          </p>
        </div>
      )}

      {/* Input Generator Area */}
      {!collection && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-slate-200/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
            
            <form onSubmit={handleGenerate} className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="sm:col-span-2">
                  <label htmlFor="card-title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Topic / Document Title
                  </label>
                  <input
                    id="card-title"
                    type="text"
                    placeholder="e.g. Operating Systems: Process Scheduling"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-slate-50/70 border border-slate-200/80 rounded-2xl focus:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label htmlFor="card-count" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Target Card Count
                  </label>
                  <select
                    id="card-count"
                    value={cardCount}
                    onChange={(e) => setCardCount(Number(e.target.value))}
                    className="w-full px-4 py-3 text-sm bg-slate-50/70 border border-slate-200/80 rounded-2xl focus:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value={3}>3 Cards (Brief summary)</option>
                    <option value={4}>4 Cards (Standard breakdown)</option>
                    <option value={5}>5 Cards (Detailed flow)</option>
                    <option value={6}>6 Cards (Deep chapter study)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="study-text" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Paste Study Material, Lecture Transcript, or Notes
                </label>
                <textarea
                  id="study-text"
                  rows={6}
                  placeholder="Paste lecture notes or chapter text to chunk into bite-sized learning cards..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full px-4 py-3.5 text-sm bg-slate-50/70 border border-slate-200/80 rounded-2xl focus:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all leading-relaxed placeholder:text-slate-400 text-slate-800"
                />
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 text-rose-800 text-xs shadow-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="group flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-400/25 hover:shadow-xl hover:shadow-amber-400/35 transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Focus Cards...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
                      <span>Generate Focus Cards</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div>
            <FocusTimer />
          </div>
        </div>
      )}

      {/* Cards Reader Display */}
      {collection && currentCard && (
        <div className="space-y-8">
          {/* Top Progress & Actions Bar */}
          <div className="glass-panel p-5 sm:p-6 rounded-3xl shadow-lg shadow-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-3 py-0.5 rounded-full">
                  {collection.title || 'Study Collection'}
                </span>
                <span className="text-xs text-slate-500 font-bold">
                  Card {currentIndex + 1} of {cards.length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-40 sm:w-56 h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-black font-mono text-slate-800">
                  {completedIds.length}/{cards.length} completed ({progressPercent}%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setZenMode((prev) => !prev)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-all cursor-pointer"
                title="Distraction-free reading view"
              >
                {zenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{zenMode ? 'Exit Zen Mode' : 'Zen Focus'}</span>
              </button>

              <button
                onClick={() => setCollection(null)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>New Session</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* The Active Focus Card */}
            <div className="lg:col-span-2 glass-panel p-6 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 space-y-7 relative overflow-hidden">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <span className="text-xs font-black text-indigo-600 tracking-wider uppercase">
                    Section {currentCard.sectionNumber || currentIndex + 1}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                    {currentCard.title}
                  </h2>
                  {collection._note && (
                    <span className="inline-block mt-2 text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/60">
                      {collection._note}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => toggleComplete(currentCard.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                    completedIds.includes(currentCard.id)
                      ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                  }`}
                >
                  {completedIds.includes(currentCard.id) ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Completed</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-4 h-4 text-slate-400" />
                      <span>Mark Complete</span>
                    </>
                  )}
                </button>
              </div>

              {/* Main Idea Highlight */}
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 block mb-1">
                  Main Idea
                </span>
                <p className="text-sm font-semibold text-slate-800 leading-snug">
                  {currentCard.mainIdea}
                </p>
              </div>

              {/* Explanation */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Concept Breakdown
                </h3>
                <p className="text-sm text-slate-800 leading-relaxed font-normal">
                  {currentCard.explanation}
                </p>
              </div>

              {/* Key Points */}
              {currentCard.keyPoints && currentCard.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Key Highlights
                  </h3>
                  <ul className="space-y-2">
                    {currentCard.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Vocabulary */}
              {currentCard.vocabulary && currentCard.vocabulary.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Essential Terms in this Section
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentCard.vocabulary.map((vocab, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <span className="font-bold text-slate-900 block">{vocab.term}</span>
                        <span className="text-slate-600 text-[11px]">{vocab.definition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Self Check Question */}
              {currentCard.selfCheck && (
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-3">
                  <HelpCircle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 block mb-0.5">
                      Quick Self-Check
                    </span>
                    <p className="text-xs font-medium text-slate-800">
                      {currentCard.selfCheck}
                    </p>
                  </div>
                </div>
              )}

              {/* Card Footer Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-all cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {/* Card Dots Navigation */}
                <div className="flex items-center gap-2">
                  {cards.map((c, idx) => (
                    <button
                      key={c.id || idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-2.5 rounded-full transition-all cursor-pointer ${
                        currentIndex === idx
                          ? 'bg-amber-400 w-8 shadow-xs shadow-amber-400/50'
                          : completedIds.includes(c.id)
                          ? 'bg-emerald-500 w-2.5'
                          : 'bg-slate-200 hover:bg-slate-300 w-2.5'
                      }`}
                      title={`Go to Card ${idx + 1}`}
                      aria-label={`Go to Card ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, cards.length - 1))}
                  disabled={currentIndex === cards.length - 1}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-md shadow-amber-400/20 disabled:opacity-30 transition-all cursor-pointer"
                >
                  <span>Next Card</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sidebar with Focus Timer */}
            {!zenMode && (
              <div className="space-y-6">
                <FocusTimer />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
