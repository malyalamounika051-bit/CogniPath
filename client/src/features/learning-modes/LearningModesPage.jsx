import React, { useState } from 'react';
import { api } from '../../services/api';
import {
  Brain,
  BookMarked,
  ListOrdered,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function LearningModesPage() {
  const [topic, setTopic] = useState('');
  const [activeMode, setActiveMode] = useState('story');
  const [level, setLevel] = useState('beginner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cached results for seamless switching
  const [modeOutputs, setModeOutputs] = useState({
    story: null,
    step_by_step: null,
    quiz: null,
  });

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [revealedAnswers, setRevealedAnswers] = useState({});

  const handleFetchMode = async (modeToFetch, currentTopic = topic) => {
    if (!currentTopic.trim()) {
      setError('Please enter a concept or topic to adapt.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.adaptMode(currentTopic, modeToFetch, level);
      setModeOutputs((prev) => ({
        ...prev,
        [modeToFetch]: data,
      }));
    } catch (err) {
      setError(err.message || 'Failed to adapt explanation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = (newMode) => {
    setActiveMode(newMode);
    if (!modeOutputs[newMode] && topic.trim()) {
      handleFetchMode(newMode);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleFetchMode(activeMode);
  };

  const handleAnswerSelect = (questionId, optionIdx, correctIdx) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const toggleRevealAnswer = (questionId) => {
    setRevealedAnswers((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const currentResult = modeOutputs[activeMode];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-semibold mb-2">
          <Brain className="w-3.5 h-3.5 text-purple-600" />
          <span>Adaptive Learning Switcher</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Explore the Same Concept in Your Preferred Style
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Switch between relatable stories, structured step-by-step logic, or interactive practice questions with one click.
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="mode-topic" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Concept or Topic
              </label>
              <input
                id="mode-topic"
                type="text"
                placeholder="e.g. Recursion, Supply and Demand, Quantum Entanglement"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-purple-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="mode-level" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Difficulty
              </label>
              <select
                id="mode-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-purple-500 outline-none bg-white font-medium text-slate-700"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Learning Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleModeSwitch('story')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  activeMode === 'story'
                    ? 'border-purple-500 bg-purple-50/70 text-purple-950 font-bold shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <BookMarked className={`w-5 h-5 ${activeMode === 'story' ? 'text-purple-600' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs block">Story Mode</span>
                  <span className="text-[10px] text-slate-500 font-normal">Relatable narrative</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeSwitch('step_by_step')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  activeMode === 'step_by_step'
                    ? 'border-purple-500 bg-purple-50/70 text-purple-950 font-bold shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <ListOrdered className={`w-5 h-5 ${activeMode === 'step_by_step' ? 'text-purple-600' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs block">Step-by-Step Logic</span>
                  <span className="text-[10px] text-slate-500 font-normal">Sequential process</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeSwitch('quiz')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  activeMode === 'quiz'
                    ? 'border-purple-500 bg-purple-50/70 text-purple-950 font-bold shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <HelpCircle className={`w-5 h-5 ${activeMode === 'quiz' ? 'text-purple-600' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs block">Quiz Mode</span>
                  <span className="text-[10px] text-slate-500 font-normal">Test knowledge</span>
                </div>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-100 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Adapting Concept...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate in Selected Mode</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Mode Output Display */}
      {currentResult && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
                Mode: {activeMode.replace('_', ' ')}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                {currentResult.storyTitle || topic || 'Concept Study'}
              </h2>
              {currentResult._note && (
                <span className="inline-block mt-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {currentResult._note}
                </span>
              )}
            </div>
          </div>

          {/* Mode A: Story Mode */}
          {activeMode === 'story' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-800 block">
                  The Story
                </span>
                <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-serif">
                  {currentResult.storyText}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Connection to the Concept
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {currentResult.conceptConnection}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">
                    Core Insight
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                    {currentResult.moralOrInsight}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mode B: Step-by-Step Logic Mode */}
          {activeMode === 'step_by_step' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">1. What It Means</span>
                  <p className="text-xs text-slate-800 leading-relaxed">{currentResult.whatItMeans}</p>
                </div>
                <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-700">2. Why It Matters</span>
                  <p className="text-xs text-slate-800 leading-relaxed">{currentResult.whyItMatters}</p>
                </div>
              </div>

              {/* Sequential Steps */}
              {currentResult.howItWorks && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    3. How It Works (Sequence)
                  </h3>
                  <div className="space-y-2.5">
                    {currentResult.howItWorks.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Example and Common Mistake */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentResult.workedExample && (
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">4. Worked Example</span>
                    <p className="text-xs text-slate-800 font-mono leading-relaxed">{currentResult.workedExample}</p>
                  </div>
                )}
                {currentResult.commonMistake && (
                  <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100 space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-800">5. Common Mistake to Avoid</span>
                    <p className="text-xs text-slate-800 leading-relaxed">{currentResult.commonMistake}</p>
                  </div>
                )}
              </div>

              {currentResult.summary && (
                <div className="p-4 rounded-xl bg-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
                  <strong>Summary Takeaway: </strong> {currentResult.summary}
                </div>
              )}
            </div>
          )}

          {/* Mode C: Quiz Mode */}
          {activeMode === 'quiz' && (
            <div className="space-y-6">
              <p className="text-xs text-slate-500">
                Test your understanding. Answers remain hidden until you select an option or reveal the explanation.
              </p>

              {currentResult.questions?.map((q, qIdx) => {
                const selected = selectedAnswers[q.id];
                const revealed = revealedAnswers[q.id];
                const hasSelected = selected !== undefined;
                const isCorrect = hasSelected && selected === q.correctAnswerIndex;

                return (
                  <div key={q.id || qIdx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-slate-900">
                        {qIdx + 1}. {q.question}
                      </h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        {q.difficulty}
                      </span>
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      {q.options?.map((opt, optIdx) => {
                        const isThisSelected = selected === optIdx;
                        const isThisCorrect = optIdx === q.correctAnswerIndex;

                        let style = 'bg-white border-slate-200 hover:border-purple-300 text-slate-700';
                        if (hasSelected) {
                          if (isThisSelected) {
                            style = isThisCorrect
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                              : 'bg-rose-50 border-rose-400 text-rose-900 font-bold';
                          } else if (revealed && isThisCorrect) {
                            style = 'bg-emerald-50 border-emerald-300 text-emerald-800';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleAnswerSelect(q.id, optIdx, q.correctAnswerIndex)}
                            className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${style}`}
                          >
                            <span>{opt}</span>
                            {hasSelected && isThisSelected && (
                              isThisCorrect ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                              )
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Feedback and Reveal explanation */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                      {hasSelected ? (
                        <span className={`font-semibold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isCorrect ? '✓ Correct!' : '✗ Not quite. Check the explanation.'}
                        </span>
                      ) : (
                        <span className="text-slate-400">Select an answer above</span>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleRevealAnswer(q.id)}
                        className="text-purple-600 hover:text-purple-700 font-bold underline"
                      >
                        {revealed ? 'Hide Explanation' : 'Reveal Explanation'}
                      </button>
                    </div>

                    {revealed && (
                      <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-purple-900 leading-relaxed">
                        <strong>Explanation: </strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
