// client/src/components/shakti/ShaktiDashboardCard.jsx
import React from 'react';
import {
  Flame,
  Sparkles,
  MessageSquareText,
  Sun,
  Compass,
  CalendarClock,
  Info,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useShakti } from '../../context/ShaktiContext';
import { SHAKTI_SUGGESTED_PROMPTS } from './shaktiMockData';

const ICONS = {
  Sun,
  Compass,
  CalendarClock,
  Info,
};

export default function ShaktiDashboardCard() {
  const { openShakti, openWithPrompt } = useShakti();

  return (
    <div
      className="glass-panel card-3d p-5 rounded-3xl relative overflow-hidden border border-orange-200/80 dark:border-orange-950/60 shadow-lg animate-fadeIn"
      style={{
        background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.4) 0%, rgba(255, 237, 213, 0.3) 50%, rgba(254, 215, 170, 0.2) 100%)',
      }}
    >
      {/* Decorative ambient flare */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-orange-400/10 blur-2xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
        {/* Left Side: Avatar & Description */}
        <div className="flex items-start gap-4 max-w-2xl">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md mt-1"
            style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #dc2626 100%)',
              boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)',
            }}
          >
            <Flame className="w-6 h-6 text-white stroke-[2.5]" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className="text-lg font-black text-slate-900 dark:text-white tracking-tight"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Meet <span className="text-orange-500">Shakti</span>
                <span className="text-xs font-normal text-slate-700 dark:text-slate-300 ml-1.5 font-sans">(शक्ति)</span>
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-400/30">
                Citizen Heat Assistant
              </span>
            </div>

            <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-0.5">
              Understand the Heat. Know Your Risk. Act in Time.
            </p>

            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed mt-1.5">
              Ask Shakti about physiological heat risks, personalized hydration schedules, safe transit hours, or how to interpret your vulnerability metrics.
            </p>
          </div>
        </div>

        {/* Right Side: Launch Button */}
        <div className="shrink-0 flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={openShakti}
            className="btn-3d w-full sm:w-auto px-5 py-2.5 rounded-2xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              boxShadow: '0 4px 16px rgba(234, 88, 12, 0.4)',
            }}
          >
            <MessageSquareText className="w-4 h-4" />
            <span>Chat with Shakti</span>
            <ChevronRight className="w-4 h-4 opacity-80" />
          </button>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="mt-4 pt-3.5 border-t border-orange-200/60 dark:border-slate-800/80 relative z-10">
        <div className="flex items-center gap-1.5 mb-2 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Quick questions for Shakti:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {SHAKTI_SUGGESTED_PROMPTS.map((prompt) => {
            const Icon = ICONS[prompt.icon] || Info;
            return (
              <button
                key={prompt.id}
                type="button"
                onClick={() => openWithPrompt(prompt.text)}
                className="group flex items-center gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-850 border border-stone-200/80 dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500/50 shadow-xs hover:shadow-md transition-all text-left cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-950/70 border border-orange-200 dark:border-orange-900/60 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Icon className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
                  {prompt.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
