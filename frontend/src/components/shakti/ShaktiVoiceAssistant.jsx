// client/src/components/shakti/ShaktiVoiceAssistant.jsx
import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Square,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  Volume2,
  RefreshCw,
} from 'lucide-react';
import { useShakti } from '../../context/ShaktiContext';

const VOICE_STATES = [
  { id: 'ready', label: 'Ready to Listen' },
  { id: 'listening', label: 'Listening' },
  { id: 'processing', label: 'Processing' },
  { id: 'speaking', label: 'Speaking' },
  { id: 'stopped', label: 'Stopped' },
  { id: 'permission_denied', label: 'Permission Denied' },
  { id: 'error', label: 'Audio Error' },
];

export default function ShaktiVoiceAssistant() {
  const [voiceState, setVoiceState] = useState('ready');
  const [elapsedSec, setElapsedSec] = useState(0);
  const { showFeedbackToast, setActiveMode, openWithPrompt } = useShakti();

  // Simulated timer during listening/speaking
  useEffect(() => {
    let interval = null;
    if (voiceState === 'listening' || voiceState === 'speaking') {
      interval = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    } else {
      setElapsedSec(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [voiceState]);

  const handleSimulatedMicClick = () => {
    if (voiceState === 'ready' || voiceState === 'stopped') {
      setVoiceState('listening');
      showFeedbackToast('Simulated listening started. Speak your heat query...');
    } else if (voiceState === 'listening') {
      setVoiceState('processing');
      showFeedbackToast('Simulating audio transcription & AI reasoning...');
      setTimeout(() => {
        setVoiceState('speaking');
        showFeedbackToast('Simulating text-to-speech spoken playback...');
      }, 2000);
    } else if (voiceState === 'speaking') {
      setVoiceState('stopped');
      showFeedbackToast('Spoken response stopped.');
    } else {
      setVoiceState('ready');
    }
  };

  const handleSimulateQuestion = (query) => {
    openWithPrompt(query);
  };

  return (
    <div className="flex flex-col h-full bg-stone-50/70 dark:bg-slate-950/70 overflow-y-auto p-4 sm:p-6 text-center animate-fadeIn">
      {/* Dev-preview disclaimer banner */}
      <div className="bg-amber-500/10 border border-amber-400/30 dark:border-amber-500/20 rounded-2xl p-3 mb-5 text-left flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
              Mode 2: Voice Assistant (UI State Harness)
            </span>
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
              Phase 1
            </span>
          </div>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
            Demonstrating all voice lifecycle UI states (listening, transcription, speech generation, and permission safeguards). Microphone permissions and real audio streams connect in Phase 2.
          </p>
        </div>
      </div>

      {/* State Switcher Tabs (For testing and inspecting every UI state) */}
      <div className="mb-6">
        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
          <span>Inspect Voice UI State:</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
          {VOICE_STATES.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setVoiceState(st.id)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                voiceState === st.id
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-stone-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 my-auto">
        {/* ── STATE: READY ──────────────────────── */}
        {voiceState === 'ready' && (
          <div className="flex flex-col items-center max-w-xs animate-fadeIn">
            <div className="relative mb-6">
              <button
                type="button"
                onClick={handleSimulatedMicClick}
                className="w-24 h-24 rounded-full flex items-center justify-center cursor-pointer shadow-xl hover:scale-105 active:scale-95 transition-all"
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  boxShadow: '0 8px 30px rgba(234, 88, 12, 0.4)',
                }}
                aria-label="Tap to speak"
              >
                <Mic className="w-10 h-10 text-white" />
              </button>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Ready to Listen
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1">
              Tap the microphone to begin a simulated voice query.
            </p>
          </div>
        )}

        {/* ── STATE: LISTENING ──────────────────── */}
        {voiceState === 'listening' && (
          <div className="flex flex-col items-center max-w-xs animate-fadeIn">
            <div className="relative mb-6 flex items-center justify-center">
              {/* Expanding ripple ring */}
              <div className="absolute w-32 h-32 rounded-full border-2 border-orange-500/60 animate-shakti-ripple pointer-events-none" />
              <button
                type="button"
                onClick={handleSimulatedMicClick}
                className="relative z-10 w-24 h-24 rounded-full bg-red-500 flex items-center justify-center cursor-pointer shadow-xl animate-pulse"
                style={{ boxShadow: '0 0 40px rgba(239, 68, 68, 0.5)' }}
                aria-label="Tap to complete speaking"
              >
                <Mic className="w-10 h-10 text-white" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <h3 className="text-base font-black text-red-600 dark:text-red-400" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Listening to Citizen...
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              00:{elapsedSec < 10 ? `0${elapsedSec}` : elapsedSec}
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1">
              Tap the red microphone button when finished speaking.
            </p>
          </div>
        )}

        {/* ── STATE: PROCESSING ─────────────────── */}
        {voiceState === 'processing' && (
          <div className="flex flex-col items-center max-w-xs animate-fadeIn">
            <div className="w-24 h-24 rounded-full bg-stone-200 dark:bg-slate-800 border-2 border-orange-500/50 flex items-center justify-center mb-6 shadow-md">
              <RefreshCw className="w-10 h-10 text-orange-500 animate-spin" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Transcribing &amp; Reasoning...
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1">
              Converting speech to text and analyzing heat physiological factors.
            </p>
          </div>
        )}

        {/* ── STATE: SPEAKING ───────────────────── */}
        {voiceState === 'speaking' && (
          <div className="flex flex-col items-center max-w-xs animate-fadeIn">
            <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mb-6 shadow-xl relative" style={{ boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)' }}>
              {/* Dynamic waveform bars */}
              <div className="flex items-center gap-1 h-8">
                <span className="w-1 bg-white rounded-full animate-audio-bar-1 h-full" />
                <span className="w-1 bg-white rounded-full animate-audio-bar-2 h-full" />
                <span className="w-1 bg-white rounded-full animate-audio-bar-3 h-full" />
                <span className="w-1 bg-white rounded-full animate-audio-bar-4 h-full" />
                <span className="w-1 bg-white rounded-full animate-audio-bar-5 h-full" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <Volume2 className="w-4 h-4 text-emerald-500" />
              <h3 className="text-base font-black text-emerald-600 dark:text-emerald-400" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Speaking Response Aloud...
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-3">
              00:{elapsedSec < 10 ? `0${elapsedSec}` : elapsedSec}
            </span>
            <button
              type="button"
              onClick={() => setVoiceState('stopped')}
              className="btn-3d px-4 py-2 rounded-xl bg-stone-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Speaking</span>
            </button>
          </div>
        )}

        {/* ── STATE: STOPPED ────────────────────── */}
        {voiceState === 'stopped' && (
          <div className="flex flex-col items-center max-w-xs animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-stone-200 dark:bg-slate-800 flex items-center justify-center mb-5 shadow-inner">
              <MicOff className="w-8 h-8 text-slate-600 dark:text-slate-400" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Voice Session Stopped
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1 mb-4">
              Session terminated. You can restart anytime or continue in text chat.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVoiceState('ready')}
                className="btn-3d btn-3d-orange px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restart Voice</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('text')}
                className="btn-3d btn-3d-surface px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Back to Text
              </button>
            </div>
          </div>
        )}

        {/* ── STATE: PERMISSION DENIED ─────────── */}
        {voiceState === 'permission_denied' && (
          <div className="flex flex-col items-center max-w-xs animate-fadeIn p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80">
            <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center mb-3">
              <ShieldAlert className="w-7 h-7 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-sm font-black text-rose-800 dark:text-rose-300">
              Microphone Access Denied
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5 leading-relaxed">
              Browser microphone permission was rejected or unavailable. In Phase 2, click the lock icon in your browser address bar to grant access.
            </p>
            <button
              type="button"
              onClick={() => setVoiceState('ready')}
              className="mt-4 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
            >
              Reset to Ready
            </button>
          </div>
        )}

        {/* ── STATE: ERROR ──────────────────────── */}
        {voiceState === 'error' && (
          <div className="flex flex-col items-center max-w-xs animate-fadeIn p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center mb-3">
              <AlertCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-sm font-black text-amber-800 dark:text-amber-300">
              Audio Stream Disrupted
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5 leading-relaxed">
              Unable to capture audio buffer. Please check your system audio input device and retry.
            </p>
            <button
              type="button"
              onClick={() => setVoiceState('ready')}
              className="mt-4 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
            >
              Retry Voice Stream
            </button>
          </div>
        )}
      </div>

      {/* Quick Test Triggers */}
      <div className="mt-4 pt-4 border-t border-stone-200 dark:border-slate-800">
        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
          Or simulate voice-to-text question:
        </span>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => handleSimulateQuestion('What should I know before travelling in hot weather?')}
            className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 hover:border-orange-500 rounded-xl px-3 py-1.5 transition-all cursor-pointer"
          >
            🎙️ "What should I know before travelling in hot weather?"
          </button>
        </div>
      </div>
    </div>
  );
}
