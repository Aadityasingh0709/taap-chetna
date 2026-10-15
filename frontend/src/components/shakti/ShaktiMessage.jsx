// client/src/components/shakti/ShaktiMessage.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Flame,
  User,
  Volume2,
  Square,
  Copy,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';
import { useShakti } from '../../context/ShaktiContext';

export default function ShaktiMessage({ message, onSelectPrompt }) {
  const isUser = message.sender === 'user';
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showFeedbackToast, locale } = useShakti();
  const utteranceRef = useRef(null);

  // Clean up any ongoing speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stripMarkdownForSpeech = (rawText) => {
    if (!rawText) return '';
    return rawText
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link text](url) -> link text
      .replace(/[#*_~`>]/g, ' ')               // remove markdown formatting tokens
      .replace(/[-+*]\s+/g, '. ')              // bullets to pauses
      .replace(/\n+/g, '. ')                   // line breaks to pauses
      .replace(/🌡️|🙏|☀️|🚨|💧|⚠️|✅|🚩/g, '')     // strip common emojis that sound jarring
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleToggleAudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showFeedbackToast('Text-to-speech is not supported by your browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      showFeedbackToast('Audio playback stopped.');
      return;
    }

    // Cancel any other currently speaking utterance
    window.speechSynthesis.cancel();

    const cleanText = stripMarkdownForSpeech(message.text);
    if (!cleanText) {
      showFeedbackToast('No text available to read aloud.');
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utteranceRef.current = utterance;

      // Detect language (Devanagari characters or active Hindi locale)
      const hasDevanagari = /[\u0900-\u097F]/.test(cleanText);
      const isHindi = hasDevanagari || locale === 'hi';
      utterance.lang = isHindi ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.95; // Natural, clear cadence
      utterance.pitch = 1.0;

      // Select best matching voice from available voices
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const matchingVoice = voices.find((v) =>
          isHindi
            ? v.lang.toLowerCase().startsWith('hi')
            : (v.lang.toLowerCase().startsWith('en-in') || v.lang.toLowerCase().startsWith('en'))
        );
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
      }

      utterance.onstart = () => {
        setIsPlayingAudio(true);
        showFeedbackToast('Playing response aloud...');
      };

      utterance.onend = () => {
        setIsPlayingAudio(false);
      };

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.error('[Shakti TTS] Speech synthesis error:', e);
          showFeedbackToast('Could not complete audio playback.');
        }
        setIsPlayingAudio(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('[Shakti TTS] Execution error:', err);
      setIsPlayingAudio(false);
      showFeedbackToast('Speech synthesis unavailable.');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showFeedbackToast('Could not copy to clipboard.');
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-2.5 items-end mb-4 animate-fadeIn">
        <div className="max-w-[82%] sm:max-w-[75%] flex flex-col items-end">
          <div
            className="px-4 py-3 rounded-2xl rounded-br-xs text-sm font-medium leading-relaxed text-white shadow-md select-text break-words [overflow-wrap:anywhere]"
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.25)',
            }}
          >
            <p className="whitespace-pre-wrap">{message.text}</p>
          </div>
          <span className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-1 px-1">
            {message.timestamp}
          </span>
        </div>
        <div className="w-7 h-7 rounded-xl bg-orange-100 dark:bg-orange-950/80 border border-orange-300/80 dark:border-orange-800 flex items-center justify-center shrink-0 mb-5 shadow-xs">
          <User className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
        </div>
      </div>
    );
  }

  // Assistant Message (Shakti)
  return (
    <div className="flex justify-start gap-2.5 items-start mb-5 animate-fadeIn">
      {/* Shakti Avatar */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5"
        style={{
          background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #dc2626 100%)',
          boxShadow: '0 2px 10px rgba(249, 115, 22, 0.35)',
        }}
      >
        <Flame className="w-4 h-4 text-white stroke-[2.5]" />
      </div>

      <div className="max-w-[88%] sm:max-w-[82%] flex flex-col items-start">
        {/* Message Bubble */}
        <div className="w-full bg-white dark:bg-slate-900 border border-stone-200/90 dark:border-slate-800 rounded-2xl rounded-tl-xs p-4 shadow-sm text-slate-800 dark:text-slate-100">
          {/* Header Tag / Preview Indicator */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-stone-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Shakti <span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 font-sans">(शक्ति)</span>
              </span>
              {message.isError ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-400/25">
                  Service Notice
                </span>
              ) : message.isAi ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-400/25">
                  <Sparkles className="w-2.5 h-2.5" />
                  GroqCloud AI
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500/12 text-amber-700 dark:text-amber-400 border border-amber-400/25">
                  <Sparkles className="w-2.5 h-2.5" />
                  Phase 2 Connected
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold font-mono">
              {message.timestamp}
            </span>
          </div>

          {/* Body Content */}
          <div className="text-xs sm:text-[13px] leading-relaxed space-y-2 select-text break-words [overflow-wrap:anywhere]">
            {message.text.split('\n\n').map((paragraph, idx) => {
              // Format bullet points nicely
              if (paragraph.includes('•')) {
                return (
                  <ul key={idx} className="space-y-1.5 my-2 pl-1">
                    {paragraph.split('\n').map((line, lIdx) => {
                      const trimmed = line.trim();
                      if (trimmed.startsWith('•')) {
                        const content = trimmed.substring(1).trim();
                        return (
                          <li key={lIdx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                            <span className="text-orange-500 font-bold shrink-0 mt-0.5">•</span>
                            <span dangerouslySetInnerHTML={{ __html: formatBold(content) }} />
                          </li>
                        );
                      }
                      return (
                        <p key={lIdx} className="text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: formatBold(line) }} />
                      );
                    })}
                  </ul>
                );
              }

              return (
                <p
                  key={idx}
                  className="text-slate-700 dark:text-slate-300"
                  dangerouslySetInnerHTML={{ __html: formatBold(paragraph) }}
                />
              );
            })}
          </div>

          {/* Action Footer: Voice playback UI, Copy */}
          <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-stone-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleAudio}
                className={`btn-3d px-2.5 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                  isPlayingAudio
                    ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                    : 'bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 border-stone-200 dark:border-slate-700'
                }`}
                title={isPlayingAudio ? 'Stop audio playback' : 'Listen to response aloud'}
                aria-label={isPlayingAudio ? 'Stop audio playback' : 'Listen to response aloud'}
              >
                {isPlayingAudio ? (
                  <>
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                    <span className="flex items-center gap-0.5 ml-0.5 h-2.5">
                      <span className="w-0.5 bg-white animate-audio-bar-1 h-full" />
                      <span className="w-0.5 bg-white animate-audio-bar-2 h-full" />
                      <span className="w-0.5 bg-white animate-audio-bar-3 h-full" />
                    </span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3 text-orange-500" />
                    <span>Listen</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="btn-3d px-2 py-1 text-[11px] font-bold rounded-lg bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-stone-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                title="Copy message text"
                aria-label="Copy message text"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-slate-700 dark:text-slate-300 font-medium">
              <Info className="w-2.5 h-2.5 text-slate-600 dark:text-slate-400" />
              <span>
                {message.toolCalls && message.toolCalls.length > 0
                  ? `Grounded via ${message.toolCalls.map((t) => (t.tool || '').replace(/_/g, ' ')).join(', ')}`
                  : message.isAi
                  ? 'Grounded AI Intelligence'
                  : 'Heat Safety Guidance'}
              </span>
            </div>
          </div>
        </div>

        {/* Suggested Next Questions */}
        {message.suggestedNext && message.suggestedNext.length > 0 && onSelectPrompt && (
          <div className="mt-2 pl-1 space-y-1 w-full animate-fadeIn">
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Suggested Follow-ups
            </span>
            <div className="flex flex-wrap gap-1.5">
              {message.suggestedNext.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectPrompt(q)}
                  className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-stone-100 dark:bg-slate-800/90 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-orange-600 dark:hover:text-orange-400 border border-stone-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-left transition-all cursor-pointer"
                >
                  💬 {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Basic markdown bold parser helper: turns **text** into <strong>text</strong>
function formatBold(str) {
  if (!str) return '';
  return str.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');
}
