import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

export default function FocusTimer() {
  const [selectedMinutes, setSelectedMinutes] = useState(15);
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [isActive, setIsActive] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      setIsCompleted(true);
      // Gentle notification tone if permitted
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (_) {}
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  const selectDuration = (mins) => {
    setSelectedMinutes(mins);
    setSecondsLeft(mins * 60);
    setIsActive(false);
    setIsCompleted(false);
  };

  const toggleTimer = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(selectedMinutes * 60);
      setIsCompleted(false);
    }
    setIsActive((prev) => !prev);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsCompleted(false);
    setSecondsLeft(selectedMinutes * 60);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const val = parseInt(customInput, 10);
    if (val && val > 0 && val <= 120) {
      selectDuration(val);
      setCustomInput('');
    }
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progressPercent = ((selectedMinutes * 60 - secondsLeft) / (selectedMinutes * 60)) * 100;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <Clock className="w-5 h-5 text-sky-600" />
          <span>Bite-Sized Focus Timer</span>
        </div>
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
          Study Aid
        </span>
      </div>

      {/* Preset pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[5, 15, 25].map((minsOption) => (
          <button
            key={minsOption}
            onClick={() => selectDuration(minsOption)}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
              selectedMinutes === minsOption && !customInput
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {minsOption} min
          </button>
        ))}

        <form onSubmit={handleCustomSubmit} className="flex items-center gap-1">
          <input
            type="number"
            min="1"
            max="120"
            placeholder="Custom"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg text-center focus:border-sky-500 outline-none"
            aria-label="Custom timer minutes"
          />
          <button
            type="submit"
            className="px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium"
          >
            Set
          </button>
        </form>
      </div>

      {/* Timer display */}
      <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-xl mb-4 relative overflow-hidden">
        {/* Progress bar line */}
        <div
          className="absolute top-0 left-0 h-1 bg-sky-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />

        <div className="text-4xl font-mono font-bold tracking-tight text-slate-800 mb-1">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {isCompleted ? (
            <span className="text-emerald-600 font-semibold">🎉 Focus session completed! Take a break.</span>
          ) : isActive ? (
            'Timer running • Stay focused on this card'
          ) : (
            'Paused'
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={toggleTimer}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            isActive
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-sky-600 hover:bg-sky-700 text-white'
          }`}
        >
          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isActive ? 'Pause' : secondsLeft === 0 ? 'Restart' : 'Start Focus'}</span>
        </button>

        <button
          onClick={resetTimer}
          className="p-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600"
          title="Reset Timer"
          aria-label="Reset Timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-slate-400 text-center mt-3">
        CogniPath focus timer is an adaptive pacing aid to manage cognitive fatigue.
      </p>
    </div>
  );
}
