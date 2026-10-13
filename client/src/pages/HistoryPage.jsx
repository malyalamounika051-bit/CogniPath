import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  History as HistoryIcon,
  Trash2,
  BookOpen,
  Calendar,
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory();
      setHistory(data || []);
    } catch (err) {
      setError('Failed to load learning history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    try {
      await api.deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
    } catch (err) {
      alert('Failed to delete item.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-semibold mb-2">
          <HistoryIcon className="w-3.5 h-3.5 text-sky-600" />
          <span>Persistent Learning History</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Your Saved Sessions & Study Progress
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Review previous concept explanations, focus cards, and practice scenarios whenever you need a quick refresher.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No learning history recorded yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Use any of the 5 learning tools and your completed sessions will be saved here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* History list */}
          <div className="md:col-span-1 space-y-3">
            {history.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/60 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.featureType?.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400">{dateStr}</span>
                  </div>

                  <h4 className="font-bold text-xs text-slate-900 truncate">
                    {item.inputTitle || 'Learning Session'}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {item.inputSummary}
                  </p>

                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Session Detail View */}
          <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            {selectedItem ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                      {selectedItem.featureType?.replace('_', ' ')}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      {selectedItem.inputTitle}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(selectedItem.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Summary</span>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedItem.inputSummary}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-100 text-xs text-sky-800">
                  💡 You can revisit or test this topic again at any time using the corresponding tool from the top navigation.
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <BookOpen className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs font-medium">Select a session on the left to inspect details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
