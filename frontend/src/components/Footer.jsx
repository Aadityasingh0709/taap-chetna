// client/src/components/Footer.jsx
import React from 'react';
import { Flame, PhoneCall, ExternalLink, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-stone-200 dark:border-slate-800 bg-stone-100/90 dark:bg-slate-950/80 backdrop-blur-md py-12 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-xs text-stone-600 dark:text-slate-400">
          {/* Col 1 */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center shadow-sm">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold text-stone-900 dark:text-white font-mono">
                TAAP <span className="text-orange-600">CHETNA</span>
              </span>
            </div>
            <p className="leading-relaxed">
              Understand the Heat. Know Your Risk. Act in Time.
            </p>
            <p className="text-[11px] text-stone-600 dark:text-slate-400">
              National Heat-Health Disaster Preparedness & Surveillance Initiative.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h4 className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[11px]">Core Intelligence Modules</h4>
            <ul className="space-y-1.5 text-stone-600 dark:text-slate-400">
              <li>Personal Heat Vulnerability Index (PHVI)</li>
              <li>Travel Thermal-Transition & Acclimatization</li>
              <li>What-If Activity Slot Planner</li>
              <li>KMC Ward Geographic Heatmap (OpenStreetMap)</li>
              <li>Automated Emergency Intervention Dispatch</li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h4 className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[11px]">National Heat Safety Helplines</h4>
            <div className="space-y-2 text-stone-700 dark:text-slate-300">
              <p className="flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
                <span>National Disaster Emergency: <strong>1070</strong></span>
              </p>
              <p className="flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
                <span>State Disaster Management: <strong>1077</strong></span>
              </p>
              <p className="flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-amber-500" />
                <span>Ambulance / Medical Emergency: <strong>108 / 112</strong></span>
              </p>
            </div>
          </div>

          {/* Col 4 */}
          <div className="space-y-2">
            <h4 className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[11px]">Scientific Frameworks</h4>
            <p className="text-stone-500 dark:text-slate-400 leading-relaxed text-[11px]">
              Groundwater thermal equations, Stull Wet-Bulb Globe Temperature (WBGT) approximation, and National Disaster Management Authority (NDMA) Heat Action Plan (HAP) protocols.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-stone-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-600 dark:text-slate-400">
          <p>© 2026 Taap Chetna Platform • Real-time Heat-Health Warning Network</p>
          <div className="flex items-center gap-4">
            <span className="font-medium">Full-Stack Production Ready • React + Express + Open-Meteo Live</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
