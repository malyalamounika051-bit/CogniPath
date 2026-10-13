import React, { useState } from 'react';
import { api } from '../../services/api';
import {
  Workflow,
  Sparkles,
  HelpCircle,
  CheckCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  Target
} from 'lucide-react';

export default function PracticeBridgePage() {
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('Computer Science');
  const [level, setLevel] = useState('beginner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [challenge, setChallenge] = useState(null);
  const [revealedHintIndex, setRevealedHintIndex] = useState(0); // 0 = none, 1 = hint 1, 2 = hint 2, etc.
  const [showSolution, setShowSolution] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please provide a concept or topic to bridge to practice.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.createPracticeChallenge(topic, subject, level);
      setChallenge(data);
      setRevealedHintIndex(0);
      setShowSolution(false);
    } catch (err) {
      setError(err.message || 'Failed to create practical challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const revealNextHint = () => {
    if (challenge?.hints && revealedHintIndex < challenge.hints.length) {
      setRevealedHintIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-semibold mb-2">
          <Workflow className="w-3.5 h-3.5 text-rose-600" />
          <span>Theory-to-Practice Bridge</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Apply Academic Theory to Realistic Problems
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Bridge the theory-to-practice gap with authentic scenarios, progressive hints that guide without spoiling, and self-evaluation rubrics.
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="challenge-topic" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Theoretical Concept
              </label>
              <input
                id="challenge-topic"
                type="text"
                placeholder="e.g. Binary Search, ACID Transactions, Supply Chain Bottlenecks"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-rose-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="challenge-subject" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Subject Domain
              </label>
              <select
                id="challenge-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-rose-500 outline-none bg-white font-medium text-slate-700"
              >
                <option value="Computer Science">Computer Science / Software</option>
                <option value="Mathematics">Mathematics / Data Science</option>
                <option value="Business Economics">Business & Economics</option>
                <option value="Natural Sciences">Natural Sciences / Engineering</option>
              </select>
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-100 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Designing Challenge...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Practice Challenge</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Challenge Display */}
      {challenge && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">
              Practical Application Challenge
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              Challenge: Applying {topic} in {subject}
            </h2>
          </div>

          {/* 1. Concept Summary & Scenario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                1. Concept Refresher
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                {challenge.conceptSummary}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800 block">
                2. Real-World Context & Scenario
              </span>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                {challenge.scenario}
              </p>
            </div>
          </div>

          {/* 3. Challenge & Requirements */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
              <Target className="w-4 h-4" />
              <span>3. Your Mission / Challenge</span>
            </div>
            <p className="text-sm font-semibold text-slate-900 leading-relaxed">
              {challenge.challenge}
            </p>

            {challenge.requirements && (
              <div className="pt-2 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Requirements to satisfy:
                </span>
                <ul className="space-y-1.5">
                  {challenge.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 4. Progressive Hints */}
          {challenge.hints && challenge.hints.length > 0 && (
            <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Progressive Hints ({revealedHintIndex} of {challenge.hints.length} revealed)
                </span>
                {revealedHintIndex < challenge.hints.length && (
                  <button
                    onClick={revealNextHint}
                    className="text-xs font-bold text-amber-800 hover:text-amber-900 underline"
                  >
                    💡 Reveal Next Hint
                  </button>
                )}
              </div>

              {revealedHintIndex === 0 ? (
                <p className="text-xs text-amber-800/80 italic">
                  Try designing your solution first before revealing hints!
                </p>
              ) : (
                <div className="space-y-2">
                  {challenge.hints.slice(0, revealedHintIndex).map((hint, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-slate-800 font-medium">
                      {hint}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. Expected Outcome & Reflection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {challenge.expectedOutcome && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Expected Outcome
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {challenge.expectedOutcome}
                </p>
              </div>
            )}

            {challenge.reflectionQuestions && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Reflection Questions
                </span>
                <ul className="space-y-1.5">
                  {challenge.reflectionQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 6. Revealable Solution / Rubric */}
          {challenge.optionalSolution && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <button
                onClick={() => setShowSolution((prev) => !prev)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
              >
                {showSolution ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
                <span>{showSolution ? 'Hide Solution Walkthrough' : 'Reveal Solution / Evaluation Rubric'}</span>
              </button>

              {showSolution && (
                <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-2 text-xs font-mono whitespace-pre-line leading-relaxed shadow-inner">
                  {challenge.optionalSolution}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
