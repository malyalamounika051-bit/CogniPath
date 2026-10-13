import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  CheckSquare,
  Plus,
  Trash2,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Circle,
  Edit2,
  Save,
  Sparkles,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

export default function TaskBreakdownPage() {
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [level, setLevel] = useState('beginner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Active Plan
  const [activePlan, setActivePlan] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);

  // Editing state for a task
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMinutes, setEditMinutes] = useState(20);

  // Adding custom task inline
  const [newTitle, setNewTitle] = useState('');
  const [newMinutes, setNewMinutes] = useState(25);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadSavedPlans();
  }, []);

  const loadSavedPlans = async () => {
    try {
      const plans = await api.getTaskPlans();
      setSavedPlans(plans || []);
      if (plans && plans.length > 0 && !activePlan) {
        setActivePlan(plans[0]);
      }
    } catch (err) {
      console.warn('Failed to fetch existing plans:', err);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!goal.trim()) {
      setError('Please describe your assignment, exam, or project goal.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const plan = await api.breakdownTask(goal, deadline, dailyMinutes, level);
      setActivePlan(plan);
      setSavedPlans((prev) => [plan, ...prev]);
    } catch (err) {
      setError(err.message || 'Failed to break down goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = async (taskId) => {
    if (!activePlan) return;
    const task = activePlan.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updatedTasks = activePlan.tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t
    );

    const updatedPlan = { ...activePlan, tasks: updatedTasks };
    setActivePlan(updatedPlan);

    try {
      await api.updateTaskItem(activePlan.id, taskId, { status: newStatus });
    } catch (err) {
      console.warn('Failed to update task item on server:', err);
    }
  };

  const startEdit = (task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditMinutes(task.estimatedMinutes);
  };

  const saveEdit = async (taskId) => {
    if (!activePlan) return;
    const updatedTasks = activePlan.tasks.map((t) =>
      t.id === taskId ? { ...t, title: editTitle, estimatedMinutes: Number(editMinutes) } : t
    );

    const updatedPlan = { ...activePlan, tasks: updatedTasks };
    setActivePlan(updatedPlan);
    setEditingTaskId(null);

    try {
      await api.updateTaskItem(activePlan.id, taskId, {
        title: editTitle,
        estimatedMinutes: Number(editMinutes),
      });
    } catch (err) {
      console.warn('Failed to save edited task item:', err);
    }
  };

  const deleteTask = async (taskId) => {
    if (!activePlan) return;
    const updatedTasks = activePlan.tasks.filter((t) => t.id !== taskId);
    const updatedPlan = { ...activePlan, tasks: updatedTasks };
    setActivePlan(updatedPlan);

    try {
      await api.updateTaskPlan(activePlan.id, { tasks: updatedTasks });
    } catch (err) {
      console.warn('Failed to delete task from plan:', err);
    }
  };

  const addNewTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !activePlan) return;

    const newTask = {
      id: `task_${Date.now()}`,
      title: newTitle.trim(),
      description: 'Custom added task',
      estimatedMinutes: Number(newMinutes) || 20,
      priority: 'medium',
      status: 'pending',
      dependencies: [],
    };

    const updatedTasks = [...activePlan.tasks, newTask];
    const updatedPlan = { ...activePlan, tasks: updatedTasks };
    setActivePlan(updatedPlan);
    setNewTitle('');
    setIsAdding(false);

    try {
      await api.updateTaskPlan(activePlan.id, { tasks: updatedTasks });
    } catch (err) {
      console.warn('Failed to add new task:', err);
    }
  };

  const deleteEntirePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this action plan?')) return;
    try {
      await api.deleteTaskPlan(planId);
      const remaining = savedPlans.filter((p) => p.id !== planId);
      setSavedPlans(remaining);
      setActivePlan(remaining[0] || null);
    } catch (err) {
      alert('Failed to delete plan.');
    }
  };

  // Calculations
  const tasks = activePlan?.tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const percentComplete = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalMinutes = tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const remainingMinutes = tasks
    .filter((t) => t.status !== 'completed')
    .reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2">
          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
          <span>Adaptive Study Planner</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Turn Broad Learning Goals into Realistic Study Plans
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Stop procrastinating on massive exams or assignments. Convert your goal into an actionable, editable session schedule with realistic time constraints.
        </p>
      </div>

      {/* Input Generator */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="goal-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Assignment or Goal Description
              </label>
              <input
                id="goal-input"
                type="text"
                placeholder="e.g. Prepare for DBMS Exam, Finish Final Year Thesis Chapter 1"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="deadline-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Deadline (Optional)
              </label>
              <input
                id="deadline-input"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="daily-minutes" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Daily Study Time
              </label>
              <select
                id="daily-minutes"
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 outline-none bg-white font-medium text-slate-700"
              >
                <option value={30}>30 mins / day</option>
                <option value={60}>60 mins / day</option>
                <option value={90}>90 mins / day</option>
                <option value={120}>2 hours / day</option>
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-100 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Breaking Down Goal...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Action Plan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Plan Details and Checklist */}
      {activePlan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Checklist */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Action Checklist
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                  {activePlan.title}
                </h2>
                {activePlan.topicOverview && (
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {activePlan.topicOverview}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
                <button
                  onClick={() => deleteEntirePlan(activePlan.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                  title="Delete Plan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress summary bar */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">Completion Progress</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold font-mono text-slate-900">{percentComplete}%</span>
                  <span className="text-xs text-slate-500">
                    ({completedTasks} of {totalTasks} tasks done)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Total: ~{totalMinutes} mins</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Remaining: ~{remainingMinutes} mins</span>
                </div>
              </div>
            </div>

            {/* Inline Add Task Form */}
            {isAdding && (
              <form onSubmit={addNewTask} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Add New Step</span>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Task title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-white"
                  />
                  <input
                    type="number"
                    min="5"
                    max="180"
                    placeholder="Mins"
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(e.target.value)}
                    className="w-20 px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-white text-center"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            {/* Task Items List */}
            <div className="space-y-3">
              {tasks.map((task, idx) => {
                const isCompleted = task.status === 'completed';
                const isEditing = editingTaskId === task.id;

                if (isEditing) {
                  return (
                    <div key={task.id} className="p-3.5 rounded-xl border border-sky-300 bg-sky-50 flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 px-2.5 py-1 text-xs border rounded-lg bg-white"
                      />
                      <input
                        type="number"
                        value={editMinutes}
                        onChange={(e) => setEditMinutes(e.target.value)}
                        className="w-16 px-2 py-1 text-xs border rounded-lg bg-white text-center"
                      />
                      <button
                        onClick={() => saveEdit(task.id)}
                        className="p-1.5 text-sky-700 hover:bg-sky-200 rounded-lg"
                        title="Save changes"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      isCompleted
                        ? 'bg-slate-50/70 border-slate-200 opacity-75'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => toggleTaskStatus(task.id)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                        title={isCompleted ? 'Mark incomplete' : 'Mark completed'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-xs sm:text-sm font-bold ${
                            isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {idx + 1}. {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Subtopics Covered */}
                        {task.subtopics && task.subtopics.length > 0 && (
                          <div className="mt-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Subtopics Covered
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {task.subtopics.map((sub, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded-md"
                                >
                                  {sub}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Learning Outcomes */}
                        {task.learningOutcomes && task.learningOutcomes.length > 0 && (
                          <div className="mt-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Key Outcomes
                            </span>
                            <ul className="space-y-0.5">
                              {task.learningOutcomes.map((lo, loIdx) => (
                                <li key={loIdx} className="text-[11px] text-slate-500 flex items-start gap-1.5">
                                  <span className="text-emerald-500 font-bold">•</span>
                                  <span>{lo}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        ~{task.estimatedMinutes}m
                      </span>
                      <button
                        onClick={() => startEdit(task)}
                        className="p-1 text-slate-400 hover:text-slate-600"
                        title="Edit task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar: Feasibility and Saved Plans */}
          <div className="space-y-6">
            {/* Feasibility Notes */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Scheduling Feasibility
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {activePlan.feasibility || 'Plan is well-sized for manageable study sessions.'}
              </p>
              {activePlan.schedulingNotes && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                  <strong>Advice: </strong> {activePlan.schedulingNotes}
                </div>
              )}
            </div>

            {/* Saved Plans */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <FolderOpen className="w-4 h-4 text-emerald-600" />
                <span>Saved Action Plans</span>
              </div>

              {savedPlans.length === 0 ? (
                <p className="text-xs text-slate-400">No other saved plans.</p>
              ) : (
                <div className="space-y-2">
                  {savedPlans.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setActivePlan(p)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs font-semibold transition-all truncate block ${
                        activePlan.id === p.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                          : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
