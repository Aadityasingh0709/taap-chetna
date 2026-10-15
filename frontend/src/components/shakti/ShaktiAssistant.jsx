// client/src/components/shakti/ShaktiAssistant.jsx
import React from 'react';
import { Flame, Sparkles, MessageSquareText, Maximize2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useShakti } from '../../context/ShaktiContext';
import ShaktiChatPanel from './ShaktiChatPanel';

export default function ShaktiAssistant() {
  const { role } = useAuth();
  const {
    isOpen,
    isMinimized,
    openShakti,
    closeShakti,
    restoreShakti,
  } = useShakti();

  // Strict citizen-only guard: Do not expose Shakti on officer or admin interfaces
  if (role === 'MUNICIPAL_OFFICER' || role === 'SYSTEM_ADMIN') {
    return null;
  }

  // 1. Minimized floating dock pill
  if (isOpen && isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 sm:bottom-7 sm:right-7 z-50 animate-fadeIn">
        <div
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-orange-300 dark:border-orange-800 shadow-xl backdrop-blur-md cursor-pointer hover:border-orange-500 transition-all select-none"
          onClick={restoreShakti}
        >
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #dc2626 100%)',
            }}
          >
            <Flame className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <div className="flex flex-col text-left">
            <span
              className="text-xs font-black text-slate-900 dark:text-white leading-none"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Shakti <span className="text-[10px] text-orange-500 font-sans font-semibold">(Minimized)</span>
            </span>
            <span className="text-[9px] text-slate-700 dark:text-slate-300 font-medium">
              Click to restore conversation
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              restoreShakti();
            }}
            className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400"
            title="Restore Assistant"
            aria-label="Restore assistant"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeShakti();
            }}
            className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400"
            title="Close Assistant"
            aria-label="Close assistant"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Open Panel
  if (isOpen) {
    return <ShaktiChatPanel />;
  }

  // 3. Floating Trigger Button (Citizen-facing entry point)
  return (
    <div className="fixed bottom-6 right-6 sm:bottom-7 sm:right-7 z-40 animate-fadeIn">
      <button
        type="button"
        onClick={openShakti}
        className="group relative flex items-center gap-2.5 p-2 sm:px-4 sm:py-2.5 rounded-full cursor-pointer transition-all duration-300 select-none"
        style={{
          background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 45%, #ea580c 100%)',
          border: '2px solid rgba(255, 255, 255, 0.35)',
          boxShadow: '0 8px 24px -4px rgba(234, 88, 12, 0.5), 0 2px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          e.currentTarget.style.boxShadow = '0 12px 28px -4px rgba(234, 88, 12, 0.65), inset 0 1px 0 rgba(255,255,255,0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(234, 88, 12, 0.5), 0 2px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4)';
        }}
        title="Open Shakti — Citizen Heat Assistant"
        aria-label="Open Shakti Citizen Heat Assistant"
      >
        {/* Pulsing Aura Ring */}
        <span className="absolute -inset-1 rounded-full bg-orange-400 opacity-30 animate-pulse pointer-events-none" />

        {/* Icon */}
        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 group-hover:rotate-6 transition-transform">
          <Flame className="w-5 h-5 text-white stroke-[2.5]" />
        </div>

        {/* Text Label on desktop and tablet */}
        <div className="hidden sm:flex flex-col text-left pr-1">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className="text-sm font-black text-white tracking-wide"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Shakti
            </span>
            <span className="text-[10px] text-orange-100 font-medium">
              (शक्ति)
            </span>
          </div>
          <span className="text-[10px] text-orange-100 font-bold tracking-tight">
            Heat Assistant
          </span>
        </div>

        {/* Little Sparkle */}
        <Sparkles className="w-3.5 h-3.5 text-yellow-200 hidden sm:inline shrink-0" />
      </button>
    </div>
  );
}
