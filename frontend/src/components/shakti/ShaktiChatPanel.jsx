// client/src/components/shakti/ShaktiChatPanel.jsx
import React, { useState } from 'react';
import {
  Flame,
  X,
  Minus,
  RotateCcw,
  Settings,
  Sparkles,
  Languages,
} from 'lucide-react';
import { useShakti } from '../../context/ShaktiContext';
import ShaktiModeSelector from './ShaktiModeSelector';
import ShaktiTextChat from './ShaktiTextChat';
import ShaktiVoiceAssistant from './ShaktiVoiceAssistant';
import ShaktiLiveVoice from './ShaktiLiveVoice';

export default function ShaktiChatPanel() {
  const {
    isOpen,
    closeShakti,
    minimizeShakti,
    activeMode,
    setActiveMode,
    clearConversation,
    feedbackToast,
    showFeedbackToast,
  } = useShakti();

  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shakti Citizen Heat Assistant"
      className="fixed inset-x-0 bottom-0 top-14 sm:top-auto sm:inset-auto sm:bottom-6 sm:right-6 w-full sm:w-[440px] sm:h-[650px] sm:max-h-[88vh] z-50 flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-stone-300/80 dark:border-slate-850 shadow-2xl animate-fadeIn"
      style={{
        boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0,0,0,0.2)',
      }}
    >
      {/* ── Top Header ────────────────────────────────────── */}
      <div className="relative px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-stone-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
            style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #dc2626 100%)',
              boxShadow: '0 2px 10px rgba(249, 115, 22, 0.4)',
            }}
          >
            <Flame className="w-5 h-5 text-white stroke-[2.5]" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-base font-black tracking-tight text-slate-900 dark:text-white"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Shakti <span className="text-orange-500 font-sans text-xs font-semibold">(शक्ति)</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-400/25">
                Phase 1 Preview
              </span>
            </div>
            <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium">
              Citizen Heat Assistant • Offline Mode
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {/* New Chat / Reset */}
          <button
            type="button"
            onClick={clearConversation}
            className="btn-3d p-1.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 border-stone-200 dark:border-slate-700 cursor-pointer transition-all"
            title="Start new conversation"
            aria-label="Start new conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Settings Menu Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="btn-3d p-1.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-stone-200 dark:border-slate-700 cursor-pointer transition-all"
              title="Assistant Settings"
              aria-label="Assistant settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Compact Settings Popover */}
            {settingsOpen && (
              <div className="absolute right-0 top-10 w-64 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-xl z-50 text-left text-xs animate-fadeIn">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white">Assistant Settings</span>
                  <span className="text-[9px] text-slate-700 dark:text-slate-300 font-mono">v1.0-alpha</span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Language Mode
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-400/30 flex items-center gap-1 text-[11px]">
                        <Languages className="w-3 h-3" />
                        English (Primary)
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-stone-200 dark:border-slate-700 text-[11px]">
                        हिन्दी (Phase 2)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Voice Persona
                    </label>
                    <div className="p-2 rounded-xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300">
                      Standard Indian English &amp; Hindi natural acoustic voice synthesis (connects in Phase 2).
                    </div>
                  </div>

                  <div className="pt-1 border-t border-stone-100 dark:border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={minimizeShakti}
            className="btn-3d p-1.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-stone-200 dark:border-slate-700 cursor-pointer transition-all"
            title="Minimize Assistant"
            aria-label="Minimize assistant"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={closeShakti}
            className="btn-3d p-1.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border-stone-200 dark:border-slate-700 cursor-pointer transition-all"
            title="Close Assistant"
            aria-label="Close assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Mode Selector Tabs ────────────────────────────── */}
      <ShaktiModeSelector
        activeMode={activeMode}
        onSelectMode={setActiveMode}
      />

      {/* ── Toast Feedback Notification ──────────────────── */}
      {feedbackToast && (
        <div className="bg-orange-500 text-white text-xs font-semibold py-1.5 px-4 text-center animate-fadeIn flex items-center justify-center gap-1.5 shadow-md">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* ── Active Mode Viewport ──────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {activeMode === 'text' && <ShaktiTextChat />}
        {activeMode === 'voice' && <ShaktiVoiceAssistant />}
        {activeMode === 'live' && <ShaktiLiveVoice />}
      </div>
    </div>
  );
}
