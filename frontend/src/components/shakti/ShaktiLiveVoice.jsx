// client/src/components/shakti/ShaktiLiveVoice.jsx
import React, { useState, useEffect } from 'react';
import {
  Radio,
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Flame,
} from 'lucide-react';
import { useShakti } from '../../context/ShaktiContext';
import { LIVE_VOICE_DEMO_TRANSCRIPT } from './shaktiMockData';

export default function ShaktiLiveVoice() {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionState, setSessionState] = useState('idle'); // 'idle' | 'listening' | 'responding' | 'speaking'
  const [isMuted, setIsMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [sessionSec, setSessionSec] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const { showFeedbackToast } = useShakti();

  // Simulated session timer
  useEffect(() => {
    let timer = null;
    if (sessionActive) {
      timer = setInterval(() => setSessionSec((s) => s + 1), 1000);
    } else {
      setSessionSec(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sessionActive]);

  // Simulated state cycle during active live session
  useEffect(() => {
    let cycleTimeout = null;
    if (sessionActive) {
      if (sessionState === 'listening') {
        cycleTimeout = setTimeout(() => setSessionState('responding'), 4000);
      } else if (sessionState === 'responding') {
        cycleTimeout = setTimeout(() => setSessionState('speaking'), 2000);
      } else if (sessionState === 'speaking') {
        cycleTimeout = setTimeout(() => setSessionState('listening'), 5000);
      }
    }
    return () => {
      if (cycleTimeout) clearTimeout(cycleTimeout);
    };
  }, [sessionActive, sessionState]);

  const handleToggleSession = () => {
    if (sessionActive) {
      setSessionActive(false);
      setSessionState('idle');
      showFeedbackToast('Live conversation prototype ended.');
    } else {
      setSessionActive(true);
      setSessionState('listening');
      showFeedbackToast('Live voice session simulation started (WebRTC pipeline in Phase 2).');
    }
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    showFeedbackToast(!isMuted ? 'Microphone muted (Preview)' : 'Microphone unmuted (Preview)');
  };

  const handleToggleSpeaker = () => {
    setSpeakerMuted(!speakerMuted);
    showFeedbackToast(!speakerMuted ? 'Speaker muted (Preview)' : 'Speaker unmuted (Preview)');
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? `0${m}` : m}:${s < 10 ? `0${s}` : s}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden animate-fadeIn relative">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-radial from-orange-950/30 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Top Banner / Session Info */}
      <div className="relative z-10 px-4 py-3 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {sessionActive ? (
              <>
                <span className="badge-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-slate-500" />
            )}
          </span>
          <span className="text-xs font-bold tracking-wide">
            {sessionActive ? 'LIVE CONVERSATION' : 'VOICE-TO-VOICE MODE'}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
            Phase 1 Prototype
          </span>
        </div>

        <div className="text-xs font-mono font-bold text-slate-300">
          {sessionActive ? formatTimer(sessionSec) : '00:00'}
        </div>
      </div>

      {/* Main Visualizer Stage */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Pulsing Central Orb / Visualizer */}
        <div className="relative flex items-center justify-center mb-8">
          {sessionActive && (
            <>
              {/* Ripple Ring 1 */}
              <div
                className="absolute w-48 h-48 rounded-full border border-orange-500/30 animate-shakti-ripple pointer-events-none"
                style={{ animationDuration: '3s' }}
              />
              {/* Ripple Ring 2 */}
              <div
                className="absolute w-64 h-64 rounded-full border border-orange-400/20 animate-shakti-ripple pointer-events-none"
                style={{ animationDuration: '3s', animationDelay: '1.2s' }}
              />
            </>
          )}

          {/* Central Orb */}
          <div
            className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-700 shadow-2xl relative ${
              sessionActive
                ? sessionState === 'speaking'
                  ? 'bg-gradient-to-tr from-orange-600 via-amber-500 to-rose-500 animate-shakti-orb'
                  : sessionState === 'responding'
                  ? 'bg-gradient-to-tr from-purple-700 via-indigo-600 to-cyan-500 animate-pulse'
                  : 'bg-gradient-to-tr from-red-600 via-orange-500 to-amber-500'
                : 'bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700'
            }`}
          >
            <Flame className={`w-12 h-12 text-white stroke-[2.5] ${sessionActive ? 'animate-pulse' : 'opacity-40'}`} />

            {/* Audio Wave Bars inside Orb */}
            {sessionActive && sessionState === 'speaking' && (
              <div className="flex items-center gap-1 mt-2 h-4">
                <span className="w-1 bg-white rounded-full animate-audio-bar-1 h-full" />
                <span className="w-1 bg-white rounded-full animate-audio-bar-2 h-full" />
                <span className="w-1 bg-white rounded-full animate-audio-bar-3 h-full" />
                <span className="w-1 bg-white rounded-full animate-audio-bar-4 h-full" />
              </div>
            )}
          </div>
        </div>

        {/* State Label & Guidance */}
        <div className="max-w-xs">
          <h3
            className="text-lg font-black tracking-tight"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {!sessionActive
              ? 'Continuous Voice Session'
              : sessionState === 'listening'
              ? 'Listening to your voice...'
              : sessionState === 'responding'
              ? 'Analyzing thermal data...'
              : 'Shakti is speaking...'}
          </h3>

          <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
            {!sessionActive
              ? 'Start a continuous, natural spoken dialogue with Shakti. Simulated prototype for Phase 1.'
              : isMuted
              ? 'Microphone is muted. Tap un-mute to speak.'
              : 'Speak naturally anytime. Shakti listens and provides continuous spoken guidance.'}
          </p>
        </div>
      </div>

      {/* Expandable Live Transcript Sheet */}
      <div className="relative z-10 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setShowTranscript(!showTranscript)}
          className="w-full px-4 py-2 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-orange-400" />
            <span>Live Transcript Preview</span>
          </div>
          {showTranscript ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {showTranscript && (
          <div className="px-4 py-3 max-h-40 overflow-y-auto space-y-2 border-t border-slate-800/80 text-xs animate-fadeIn">
            {LIVE_VOICE_DEMO_TRANSCRIPT.map((entry, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="font-mono text-[10px] text-slate-400 shrink-0 mt-0.5">
                  [{entry.time}]
                </span>
                <span className={`font-bold capitalize shrink-0 ${entry.speaker === 'shakti' ? 'text-orange-400' : 'text-cyan-400'}`}>
                  {entry.speaker}:
                </span>
                <span className="text-slate-300 leading-relaxed">{entry.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Voice Control Dock */}
      <div className="relative z-10 p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-center gap-4">
        {/* Mute Button */}
        <button
          type="button"
          onClick={handleToggleMute}
          disabled={!sessionActive}
          className={`btn-3d p-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
            !sessionActive
              ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-400'
              : isMuted
              ? 'bg-rose-600 text-white border-rose-700 shadow-md'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Start / End Call Toggle */}
        <button
          type="button"
          onClick={handleToggleSession}
          className={`btn-3d px-6 py-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl transition-all cursor-pointer ${
            sessionActive
              ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-800 hover:scale-105 active:scale-95'
              : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-600 hover:scale-105 active:scale-95'
          }`}
          style={{
            boxShadow: sessionActive
              ? '0 6px 20px rgba(225, 29, 72, 0.4)'
              : '0 6px 24px rgba(249, 115, 22, 0.4)',
          }}
          aria-label={sessionActive ? 'End voice call' : 'Start live voice call'}
        >
          {sessionActive ? (
            <>
              <PhoneOff className="w-5 h-5" />
              <span>End Call</span>
            </>
          ) : (
            <>
              <Radio className="w-5 h-5" />
              <span>Start Live Conversation</span>
            </>
          )}
        </button>

        {/* Speaker Volume Toggle */}
        <button
          type="button"
          onClick={handleToggleSpeaker}
          disabled={!sessionActive}
          className={`btn-3d p-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
            !sessionActive
              ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-400'
              : speakerMuted
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700'
          }`}
          title={speakerMuted ? 'Unmute speaker' : 'Mute speaker'}
          aria-label={speakerMuted ? 'Unmute speaker' : 'Mute speaker'}
        >
          {speakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Prototype Footer Disclaimer */}
      <div className="relative z-10 px-4 py-2 bg-slate-900/90 text-center text-[10px] text-slate-300 font-medium border-t border-slate-800/60">
        Continuous bidirectional WebRTC audio channel scheduled for Phase 2 integration
      </div>
    </div>
  );
}
