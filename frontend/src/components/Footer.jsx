// client/src/components/Footer.jsx
import React from 'react';
import { Flame, PhoneCall, Zap, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer
      className="mt-24 relative overflow-hidden border-t border-slate-200/80 dark:border-slate-800/80"
      style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(15,23,42,0.02) 100%)',
      }}
    >
      {/* Ambient glow accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -bottom-20 left-1/4 w-96 h-48 rounded-full blur-3xl opacity-[0.06] dark:opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 right-1/4 w-64 h-40 rounded-full blur-3xl opacity-[0.04] dark:opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 text-sm">

          {/* Col 1 — Brand */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 60%, #ef4444 100%)',
                  boxShadow: '0 4px 12px rgba(249,115,22,0.35)',
                }}
              >
                <Flame className="w-4.5 h-4.5 text-white stroke-[2.5]" />
              </div>
              <span
                className="text-base font-black text-slate-900 dark:text-white"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                TAAP <span className="text-orange-500">CHETNA</span>
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-xs">
              Understand the Heat. Know Your Risk. Act in Time.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              National Heat-Health Disaster Preparedness &amp; Surveillance Initiative, powered by real-time Open-Meteo satellite telemetry.
            </p>
            {/* Powered by badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Open-Meteo', 'XGBoost ML', 'FastAPI', 'MongoDB'].map((tech) => (
                <span
                  key={tech}
                  className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/50"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Col 2 — Core Modules */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">
              Core Intelligence Modules
            </h4>
            <ul className="space-y-2">
              {[
                { icon: '🌡️', text: 'Personal Heat Vulnerability Index (PHVI)' },
                { icon: '🧳', text: 'Travel Thermal-Transition & Acclimatization' },
                { icon: '⏱️', text: 'What-If Activity Slot Planner' },
                { icon: '🗺️', text: 'KMC Ward Geographic Heatmap' },
                { icon: '🚨', text: 'Automated Emergency Intervention' },
              ].map(({ icon, text }) => (
                <li key={text} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{icon}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Emergency Numbers */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">
              National Heat Safety Helplines
            </h4>
            <div className="space-y-2.5">
              {[
                { color: 'text-rose-500', number: '1070', label: 'National Disaster Emergency' },
                { color: 'text-rose-500', number: '1077', label: 'State Disaster Management' },
                { color: 'text-amber-500', number: '108 / 112', label: 'Ambulance / Medical Emergency' },
              ].map(({ color, number, label }) => (
                <div key={number} className="flex items-start gap-2">
                  <PhoneCall className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${color}`} />
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{number}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 4 — Scientific Frameworks */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">
              Scientific Frameworks
            </h4>
            <div className="space-y-2">
              {[
                'Rothfusz Heat Index Equation',
                'Stull Wet-Bulb Globe Temperature (WBGT)',
                'NDMA Heat Action Plan (HAP) Protocols',
                'XGBoost State-Year Mortality Prediction',
              ].map((item) => (
                <div key={item} className="flex items-start gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-slate-200/80 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 dark:text-slate-500">
          <p>© 2026 Taap Chetna Platform • Real-time Heat-Health Warning Network</p>
          <div className="flex items-center gap-1.5">
            <span>Built with</span>
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
            <span>for India's heat-vulnerable communities</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
