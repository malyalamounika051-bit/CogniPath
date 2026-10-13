import React, { useState } from 'react';
import { api } from '../../services/api';
import {
  Sparkles,
  Copy,
  Check,
  Upload,
  BookOpen,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function DecoderPage() {
  const [inputText, setInputText] = useState('');
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('beginner');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setError('Please enter some academic text, lecture notes, or a concept to decode.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.decodeJargon(inputText, level, topic);
      setResult(data);
      setShowHint(false);
    } catch (err) {
      setError(err.message || 'We could not decode the explanation right now. Your text is preserved; please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadDocument(file);
      if (res?.text) {
        setInputText(res.text);
        if (!topic) setTopic(res.filename.replace(/\.[^/.]+$/, ''));
      }
    } catch (err) {
      setError(err.message || 'Failed to parse file. Please upload a plain text, markdown, or PDF file.');
    } finally {
      setUploading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const textToCopy = `COGNIPATH DECODED EXPLANATION:
--------------------------------
Topic: ${topic || 'Academic Concept'}
Level: ${level}

SIMPLE EXPLANATION:
${result.simpleExplanation}

ANALOGY:
${result.analogy}

KEY TERMS:
${result.keyTerms?.map((k) => `• ${k.term}: ${k.definition}`).join('\n')}

TAKEAWAYS:
${result.takeaways?.map((t) => `• ${t}`).join('\n')}

EXAMPLE:
${result.example}

CHECK YOUR UNDERSTANDING:
${result.selfCheck?.question}
`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-bold tracking-wide uppercase mb-3 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Jargon-to-Analogy Decoder</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          Translate Academic Complexity into <span className="bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-800 bg-clip-text text-transparent">Plain Intuition</span>
        </h1>
        <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
          Paste dense textbook passages, lecture slides, or complex terminology to receive an intuitive explanation, relatable analogy, and self-check.
        </p>
      </div>

      {/* Input Form */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-slate-200/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="sm:col-span-2">
              <label htmlFor="topic-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Topic or Title <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <input
                id="topic-input"
                type="text"
                placeholder="e.g. Asynchronous I/O, Normalization, Photosynthesis"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-slate-50/70 border border-slate-200/80 rounded-2xl focus:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
              />
            </div>

            <div>
              <label htmlFor="level-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Target Difficulty
              </label>
              <select
                id="level-select"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-slate-50/70 border border-slate-200/80 rounded-2xl focus:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-semibold text-slate-700 cursor-pointer"
              >
                <option value="beginner">Beginner (Simple & intuitive)</option>
                <option value="intermediate">Intermediate (Balanced)</option>
                <option value="advanced">Advanced (Technical depth)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="content-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Academic Text or Concept Passage
              </label>

              <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-bold px-3 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Extracting text...' : 'Upload Document (.txt, .pdf, .md)'}</span>
                <input
                  type="file"
                  accept=".txt,.md,.pdf,.docx,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading || loading}
                />
              </label>
            </div>

            <textarea
              id="content-input"
              rows={5}
              placeholder="Paste dense academic text, definitions, or equations here..."
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

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || uploading}
              className="group flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-400/25 hover:shadow-xl hover:shadow-amber-400/35 transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Decoding Concept...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition-transform duration-300" />
                  <span>Decode into Simple Terms</span>
                  <ArrowRight className="w-4 h-4 text-slate-950/70 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Decoded Output */}
      {result && (
        <div className="glass-panel p-6 sm:p-10 rounded-3xl space-y-8 shadow-xl shadow-slate-200/50 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-400/20 border border-amber-400/30 px-3 py-1 rounded-full inline-block mb-2">
                Decoded Concept
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {topic || 'Concept Explanation'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
                title="Copy full explanation to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
              </button>
            </div>
          </div>

          {/* Simple Explanation & Analogy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-indigo-50/80 via-blue-50/40 to-white border border-indigo-100/80 rounded-2xl p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-wider">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span>Plain-Language Explanation</span>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                {result.simpleExplanation}
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-white border border-amber-200/70 rounded-2xl p-6 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-amber-950 font-black text-xs uppercase tracking-wider">
                <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <span>Real-Life Analogy</span>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                {result.analogy}
              </p>
            </div>
          </div>

          {/* Key Terms */}
          {result.keyTerms && result.keyTerms.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Essential Key Terms
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {result.keyTerms.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-1">
                    <span className="text-xs font-bold text-slate-900 block">{item.term}</span>
                    <p className="text-xs text-slate-600 leading-normal">{item.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Takeaways & Example */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {result.takeaways && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Key Takeaways
                </h3>
                <ul className="space-y-2">
                  {result.takeaways.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.example && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Practical Example
                </h3>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  {result.example}
                </div>
              </div>
            )}
          </div>

          {/* Self Check Question */}
          {result.selfCheck && (
            <div className="pt-4 border-t border-slate-100">
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-xl p-5 border border-slate-200">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider mb-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  <span>Check Your Understanding</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 mb-3">
                  {result.selfCheck.question}
                </p>

                <div>
                  <button
                    onClick={() => setShowHint((prev) => !prev)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline"
                  >
                    {showHint ? 'Hide Hint / Explanation' : '💡 Need a hint? Reveal check'}
                  </button>
                  {showHint && (
                    <p className="mt-2 text-xs text-slate-700 bg-white p-3 rounded-lg border border-indigo-100">
                      {result.selfCheck.hint}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Real Sources Used & Grounding Status */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Sources Used & Factual Grounding
                </span>
                {result.searchStatus === 'completed_with_sources' && (
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    ✓ Verified via Live Sources
                  </span>
                )}
                {result.searchStatus === 'completed_with_limited_evidence' && (
                  <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    ⚠ Limited Evidence
                  </span>
                )}
                {result.searchStatus === 'search_unavailable' && (
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                    ℹ Academic Baseline (Search Unconfigured)
                  </span>
                )}
              </div>
            </div>

            {result.verificationNotes && (
              <p className="text-xs text-slate-500 italic">
                {result.verificationNotes}
              </p>
            )}

            {result.sources && result.sources.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {result.sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-sky-300 hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-bold text-sky-700 group-hover:underline line-clamp-1">
                          {src.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                          {src.domain}
                        </span>
                      </div>
                      {src.supportedClaims && (
                        <p className="text-[11px] text-slate-600 line-clamp-2">
                          Supports: {src.supportedClaims}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-sky-600 mt-2 font-medium group-hover:text-sky-700 flex items-center gap-1">
                      View reference source →
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                No external web citations were required or configured for this baseline explanation.
              </p>
            )}
          </div>

          <div className="text-[11px] text-slate-400 pt-2 flex items-center justify-between">
            <span>Source: {result._source === 'gemini' ? 'Google Gemini AI' : 'CogniPath Grounded AI Intelligence'}</span>
            <span>Saved to your learning history</span>
          </div>
        </div>
      )}
    </div>
  );
}
