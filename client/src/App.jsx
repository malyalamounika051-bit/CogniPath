import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

import DashboardPage from './pages/DashboardPage';
import DecoderPage from './features/decoder/DecoderPage';
import FocusCardsPage from './features/focus-cards/FocusCardsPage';
import LearningModesPage from './features/learning-modes/LearningModesPage';
import TaskBreakdownPage from './features/task-breakdown/TaskBreakdownPage';
import PracticeBridgePage from './features/practice-bridge/PracticeBridgePage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AccessibilityProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 transition-colors">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/decoder" element={<DecoderPage />} />
                <Route path="/focus-cards" element={<FocusCardsPage />} />
                <Route path="/learning-modes" element={<LearningModesPage />} />
                <Route path="/task-breakdown" element={<TaskBreakdownPage />} />
                <Route path="/practice-bridge" element={<PracticeBridgePage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </AccessibilityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
