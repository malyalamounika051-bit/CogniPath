import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Sparkles,
  Layers,
  Brain,
  CheckSquare,
  Workflow,
  ArrowRight,
  Clock,
  History,
  BookOpen,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [taskPlans, setTaskPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [histRes, tasksRes] = await Promise.allSettled([
          api.getHistory(),
          api.getTaskPlans(),
        ]);
        if (histRes.status === 'fulfilled') setHistory(histRes.value || []);
        if (tasksRes.status === 'fulfilled') setTaskPlans(tasksRes.value || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const tools = [
    {
      title: 'AI Concept Decoder',
      desc: 'Decode complex academic language into intuitive everyday explanations, real-life analogies, verified key terms, and self-checks.',
      path: '/decoder',
      icon: Sparkles,
      color: 'from-amber-500 to-orange-500',
      tag: 'Comprehension & RAG',
    },
    {
      title: 'Smart Focus Cards',
      desc: 'Divide dense study passages into distinct, sequential learning cards with an integrated focus timer and self-checks.',
      path: '/focus-cards',
      icon: Layers,
      color: 'from-sky-500 to-blue-600',
      tag: 'Bite-Sized Mastery',
    },
    {
      title: 'Adaptive Study Planner',
      desc: 'Convert huge, intimidating assignments or exams into realistic, session-based checklists with sensible time constraints.',
      path: '/task-breakdown',
      icon: CheckSquare,
      color: 'from-emerald-500 to-teal-600',
      tag: 'Actionable Planning',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner - 30% Structural Blue/Indigo with 10% High-Contrast Amber Accent */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl shadow-indigo-950/20 relative overflow-hidden border border-indigo-800/40">
        {/* Subtle decorative background circles */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-amber-300 font-extrabold uppercase tracking-wider text-[10px]">60-30-10 Intelligent Canvas</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Welcome back, <span className="bg-gradient-to-r from-sky-300 via-white to-amber-200 bg-clip-text text-transparent">{user?.name || 'Learner'}</span>!
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
            Translate dense academic jargon, master concepts card by card, and conquer massive goals with scheduled micro-checklists.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-bold">
            <Link
              to="/decoder"
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-400/25 transition-all duration-200 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Decode a Concept</span>
            </Link>
            <Link
              to="/task-breakdown"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all duration-200 flex items-center gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
              <span>Generate Study Plan</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Core Learning Tools Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-sky-600 inline-block" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Core Learning Engines</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">High-impact educational tools designed for fast comprehension</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.title}
                to={tool.path}
                className="group relative bg-white rounded-3xl p-7 border border-slate-200/90 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${tool.color} flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-110 group-hover:rotate-2 transition-all duration-300`}
                    >
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                      {tool.tag}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-sky-600 transition-colors mb-2.5">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
                    {tool.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-bold text-sky-600 group-hover:text-sky-700">
                  <span className="tracking-wide">Launch Engine</span>
                  <div className="w-7 h-7 rounded-full bg-sky-50 group-hover:bg-sky-600 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent Activity and Active Tasks Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Task Plans */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base text-slate-900">Your Action Plans</h3>
            </div>
            <Link
              to="/task-breakdown"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>Manage Plans</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {taskPlans.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">No active task plans yet.</p>
              <Link
                to="/task-breakdown"
                className="mt-2 inline-block text-xs font-semibold text-sky-600 hover:underline"
              >
                Break down your first assignment →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {taskPlans.slice(0, 3).map((plan) => {
                const total = plan.tasks?.length || 0;
                const completed = plan.tasks?.filter((t) => t.status === 'completed').length || 0;
                const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <div
                    key={plan.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-3">
                      <h4 className="font-semibold text-xs text-slate-800 truncate">{plan.title}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span>{completed}/{total} tasks done</span>
                        <span>•</span>
                        <span>~{plan.totalEstimatedMinutes} mins</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-700">{percent}%</span>
                      <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Learning Sessions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-base text-slate-900">Recent Sessions</h3>
            </div>
            <Link
              to="/history"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">No saved learning sessions yet.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Your decoded concepts and focus sessions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <h4 className="font-semibold text-xs text-slate-800 truncate">
                      {item.inputTitle || 'Learning Session'}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.inputSummary}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-700 flex-shrink-0">
                    {item.featureType?.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
