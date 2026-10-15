// client/src/components/shakti/ShaktiMessageComposer.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Sparkles } from 'lucide-react';

export default function ShaktiMessageComposer({ onSend, onMicClick, disabled }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${Math.max(newHeight, 42)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '42px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isSendDisabled = !input.trim() || disabled;

  return (
    <div className="p-3 border-t border-stone-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Quick Voice Mode Button */}
        <button
          type="button"
          onClick={onMicClick}
          className="btn-3d p-2.5 rounded-xl bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-700 border-stone-200 dark:border-slate-700 shrink-0 cursor-pointer mb-0.5 transition-all"
          title="Switch to Voice Assistant (Preview)"
          aria-label="Voice input preview"
        >
          <Mic className="w-4 h-4 text-orange-500" />
        </button>

        {/* Text Input */}
        <div className="flex-1 relative bg-stone-50 dark:bg-slate-950 rounded-2xl border border-stone-300/80 dark:border-slate-700/80 focus-within:border-orange-500 dark:focus-within:border-orange-500 transition-colors shadow-inner overflow-hidden">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={disabled ? 'Shakti is formulating advice...' : 'Ask Shakti about heat risks, hydration, travel...'}
            className="w-full px-3.5 py-2.5 text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-transparent resize-none focus:outline-none max-h-[120px] leading-relaxed"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={isSendDisabled}
          className={`btn-3d p-2.5 rounded-xl flex items-center justify-center shrink-0 mb-0.5 transition-all cursor-pointer ${
            isSendDisabled
              ? 'opacity-40 cursor-not-allowed bg-stone-200 dark:bg-slate-800 text-slate-400 border-stone-300 dark:border-slate-700'
              : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-600 shadow-[0_2px_8px_rgba(249,115,22,0.35)] hover:scale-105 active:scale-95'
          }`}
          title="Send question (Enter)"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Helper caption */}
      <div className="flex items-center justify-between text-[10px] text-slate-700 dark:text-slate-300 px-1 pt-2">
        <span className="sm:hidden">Conversational AI Mode</span>
        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
          <Sparkles className="w-2.5 h-2.5" />
          GroqCloud AI Active
        </span>
      </div>
    </div>
  );
}
