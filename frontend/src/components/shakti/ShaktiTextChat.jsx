// client/src/components/shakti/ShaktiTextChat.jsx
import React, { useRef, useEffect } from 'react';
import {
  Flame,
  Sparkles,
  Sun,
  Compass,
  CalendarClock,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { useShakti } from '../../context/ShaktiContext';
import { SHAKTI_SUGGESTED_PROMPTS } from './shaktiMockData';
import ShaktiMessage from './ShaktiMessage';
import ShaktiMessageComposer from './ShaktiMessageComposer';

const PROMPT_ICONS = {
  Sun,
  Compass,
  CalendarClock,
  Info,
};

export default function ShaktiTextChat() {
  const {
    messages,
    isThinking,
    sendMessage,
    setActiveMode,
    providerInfo,
  } = useShakti();
  const modelLabel = providerInfo?.provider === 'ollama'
    ? `Local Ollama · ${providerInfo.model || 'qwen3:4b'}`
    : `GroqCloud · ${providerInfo?.model || 'configured model'}`;
  const providerStatus = providerInfo?.configured
    ? `Configured model: ${modelLabel}`
    : 'AI provider is not configured';

  const scrollBottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollBottomRef.current) {
      scrollBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-stone-50/50 dark:bg-slate-950/50">
      {/* Scrollable Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 ? (
          // Welcome Screen
          <div className="max-w-md mx-auto my-auto py-6 flex flex-col items-center text-center animate-fadeIn">
            {/* Animated Shakti Emblem */}
            <div className="relative mb-4">
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl animate-shakti-orb"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #dc2626 100%)',
                }}
              >
                <Flame className="w-8 h-8 text-white stroke-[2.5]" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-xs">
                <Sparkles className="w-3 h-3 text-white" />
              </span>
            </div>

            <h2
              className="text-xl font-black text-slate-900 dark:text-white tracking-tight"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Namaste! I'm <span className="text-orange-500">Shakti</span>
            </h2>
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-0.5">
              Citizen Heat-Health Intelligence Assistant
            </span>

            <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed mt-2.5 max-w-sm">
              I can help you understand heat-related risks, plan activities more thoughtfully, and navigate the heat-health features of Taap Chetna.
            </p>

            <div className="w-full mt-6 text-left">
              <div className="flex items-center gap-1.5 mb-2.5 px-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Ask me a question to get started:
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {SHAKTI_SUGGESTED_PROMPTS.map((prompt) => {
                  const Icon = PROMPT_ICONS[prompt.icon] || Info;
                  return (
                    <button
                      key={prompt.id}
                      type="button"
                      onClick={() => sendMessage(prompt.text)}
                      className="group flex items-start gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500/50 hover:bg-orange-50/50 dark:hover:bg-slate-850 shadow-xs hover:shadow-md transition-all text-left cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-xl bg-orange-100 dark:bg-orange-950/70 border border-orange-200 dark:border-orange-900/60 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                        <Icon className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider block">
                          {prompt.tag}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                          {prompt.text}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div role="status" className="flex items-center gap-1.5 mt-5 text-xs text-slate-700 dark:text-slate-300 bg-stone-200/50 dark:bg-slate-900/60 px-3 py-1.5 rounded-full border border-stone-300/50 dark:border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{providerStatus}</span>
            </div>
          </div>
        ) : (
          // Message History
          <>
            {messages.map((msg) => (
              <ShaktiMessage
                key={msg.id}
                message={msg}
                onSelectPrompt={sendMessage}
              />
            ))}

            {/* Thinking / Formulation Indicator */}
            {isThinking && (
              <div className="flex items-center gap-2.5 mb-4 animate-fadeIn">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #dc2626 100%)',
                  }}
                >
                  <Flame className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Shakti is formulating guidance
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollBottomRef} />
          </>
        )}
      </div>

      {/* Message Composer */}
      <ShaktiMessageComposer
        onSend={sendMessage}
        onMicClick={() => setActiveMode('voice')}
        disabled={isThinking}
        providerInfo={providerInfo}
      />
    </div>
  );
}
