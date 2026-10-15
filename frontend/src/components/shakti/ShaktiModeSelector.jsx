// client/src/components/shakti/ShaktiModeSelector.jsx
import React from 'react';
import { MessageSquareText, Mic, Radio } from 'lucide-react';

const MODES = [
  {
    id: 'text',
    label: 'Text Chat',
    shortLabel: 'Text',
    icon: MessageSquareText,
    badge: 'Active',
    badgeCls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-400/30',
  },
  {
    id: 'voice',
    label: 'Voice Assistant',
    shortLabel: 'Voice',
    icon: Mic,
    badge: 'UI Preview',
    badgeCls: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-400/30',
  },
  {
    id: 'live',
    label: 'Live Conversation',
    shortLabel: 'Live Call',
    icon: Radio,
    badge: 'Prototype',
    badgeCls: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-400/30',
  },
];

export default function ShaktiModeSelector({ activeMode, onSelectMode }) {
  return (
    <div className="px-4 py-2 border-b border-stone-200 dark:border-slate-800/80 bg-stone-50/70 dark:bg-slate-900/60 backdrop-blur-sm">
      <div
        role="tablist"
        aria-label="Shakti Interaction Modes"
        className="grid grid-cols-3 gap-1.5 p-1 bg-stone-200/70 dark:bg-slate-950/80 rounded-2xl border border-stone-300/80 dark:border-slate-800/90 shadow-inner"
      >
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;

          return (
            <button
              key={mode.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectMode(mode.id)}
              className={`relative flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] border border-stone-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-orange-500' : 'text-slate-500 dark:text-slate-400'}`} />
              <span className="truncate hidden sm:inline">{mode.label}</span>
              <span className="truncate sm:hidden">{mode.shortLabel}</span>

              {/* Status dot indicator */}
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
