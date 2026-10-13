import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import DyslexiaToolbar from '../common/DyslexiaToolbar';
import {
  Brain,
  Compass,
  Layers,
  Sparkles,
  CheckSquare,
  Workflow,
  History,
  Menu,
  X,
  User,
  LogOut,
  LogIn,
  Key,
  Check,
  AlertCircle
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [keySuccess, setKeySuccess] = useState(false);
  const [keyError, setKeyError] = useState(null);

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: Compass },
    { name: 'Concept Decoder', path: '/decoder', icon: Sparkles },
    { name: 'Focus Cards', path: '/focus-cards', icon: Layers },
    { name: 'Study Planner', path: '/task-breakdown', icon: CheckSquare },
    { name: 'History', path: '/history', icon: History },
  ];

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleSaveKey = async (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    setKeySaving(true);
    setKeyError(null);
    try {
      await api.setApiKey(apiKeyInput.trim());
      setKeySuccess(true);
      setTimeout(() => {
        setShowKeyModal(false);
        setKeySuccess(false);
        setApiKeyInput('');
      }, 1500);
    } catch (err) {
      setKeyError(err.message || 'Failed to save API key.');
    } finally {
      setKeySaving(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.03)]">
      {/* Top utility row: Accessibility bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1 flex justify-end border-b border-slate-100/60">
        <DyslexiaToolbar />
      </div>

      {/* Main navigation row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 group-hover:scale-105 group-hover:shadow-sky-500/40 transition-all duration-300">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 group-hover:text-sky-600 transition-colors">
                  CogniPath
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full shadow-sm">
                  AI
                </span>
              </div>
              <span className="hidden sm:block text-[10px] text-slate-400 font-semibold -mt-0.5 tracking-wider uppercase">
                Student Intelligence Copilot
              </span>
            </div>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    active
                      ? 'bg-white text-sky-700 shadow-sm shadow-slate-200 border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action: Gemini API Key Config + User profile / Guest */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => setShowKeyModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 text-xs font-bold text-slate-700 transition-all duration-200"
              title="Configure Google Gemini API Key"
            >
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <span>AI Setup</span>
            </button>

            {user?.isGuest ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  Guest
                </span>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 rounded-xl shadow-sm hover:shadow transition-all"
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sign In</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200/60">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{user?.name || 'Learner'}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Google Gemini AI Configuration</h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              CogniPath has built-in verified knowledge for core academic subjects (Chlorophyll, Binary Search, Normalization, etc.) and extracts directly from pasted text. To unlock live dynamic AI generation for any novel topic, paste your Google Gemini API key below:
            </p>

            <form onSubmit={handleSaveKey} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-sky-500 outline-none font-mono"
                  required
                />
              </div>

              {keyError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{keyError}</span>
                </div>
              )}

              {keySuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>API Key saved & activated successfully!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={keySaving}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50"
                >
                  {keySaving ? 'Saving...' : 'Save & Activate Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-6 space-y-1 shadow-lg">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold ${
                  active ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setShowKeyModal(true);
              }}
              className="text-xs text-amber-700 font-semibold px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 flex items-center gap-1"
            >
              <Key className="w-3.5 h-3.5" />
              <span>AI Setup</span>
            </button>

            {user?.isGuest ? (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs text-sky-600 font-semibold px-3 py-1.5 rounded-lg border border-sky-200"
              >
                Sign In
              </Link>
            ) : (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-rose-600 font-semibold px-3 py-1.5 rounded-lg border border-rose-200"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
