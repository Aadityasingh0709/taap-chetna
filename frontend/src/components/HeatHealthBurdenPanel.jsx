// frontend/src/components/HeatHealthBurdenPanel.jsx
// Visual component displaying Layer A: Historical Supervised Heat-Health Burden Model
// for Municipal Officers and Disaster Response Planners.

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Thermometer, 
  AlertOctagon, 
  Cpu, 
  BarChart3, 
  Info, 
  Sliders, 
  RefreshCw, 
  Layers, 
  Users 
} from 'lucide-react';
import { getHeatHealthBurden } from '../services/api';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Meghalaya', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export default function HeatHealthBurdenPanel({ defaultState = 'West Bengal', currentWeather = null }) {
  const [selectedState, setSelectedState] = useState(defaultState);
  const [targetYear, setTargetYear] = useState(2024);
  const [burdenData, setBurdenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simHeatwaveDays, setSimHeatwaveDays] = useState(10);
  const [simPeakTemp, setSimPeakTemp] = useState(42.0);

  const fetchBurden = async (state, year) => {
    setLoading(true);
    try {
      const res = await getHeatHealthBurden({ state, year });
      if (res && res.data) {
        setBurdenData(res.data);
      }
    } catch (err) {
      console.warn('Error fetching heat health burden:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (defaultState) {
      setSelectedState(defaultState);
    }
    fetchBurden(defaultState || 'West Bengal', targetYear);
  }, [defaultState]);

  const handleStateChange = (e) => {
    const newState = e.target.value;
    setSelectedState(newState);
    fetchBurden(newState, targetYear);
  };

  const getBurdenBadgeColor = (band) => {
    switch (band) {
      case 'CRITICAL_BURDEN':
        return 'bg-purple-600/20 text-purple-700 dark:text-purple-300 border-purple-500/40';
      case 'ELEVATED_BURDEN':
        return 'bg-red-600/20 text-red-700 dark:text-red-300 border-red-500/40';
      case 'MODERATE_BURDEN':
        return 'bg-amber-600/20 text-amber-700 dark:text-amber-300 border-amber-500/40';
      default:
        return 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="glass-panel card-3d p-6 rounded-2xl space-y-6 border border-stone-200 dark:border-slate-800">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400">
              <Cpu className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-white tracking-tight">
              Historical Heat-Health Burden Signal
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/30">
              LAYER A: ML ENGINE
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Supervised XGBoost Regressor trained on 2001–2014 state-level mortality & NASA POWER biometeorology.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-stone-600 dark:text-stone-300">State:</label>
            <select
              value={selectedState}
              onChange={handleStateChange}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchBurden(selectedState, targetYear)}
            disabled={loading}
            className="btn-3d btn-3d-surface p-2 text-stone-600 dark:text-stone-400 hover:text-orange-500 cursor-pointer"
            title="Recalculate Model Inference"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Model Derived Burden Estimate */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-stone-200 dark:border-slate-800 flex flex-col justify-between card-3d">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              State Health-Burden Estimate
            </span>
            <Activity className="w-4 h-4 text-orange-500" />
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-stone-900 dark:text-white">
                {burdenData?.model_derived_state_burden_estimate ?? '--'}
              </span>
              <span className="text-xs font-bold text-stone-500">annual deaths signal</span>
            </div>
            <div className="mt-2">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getBurdenBadgeColor(burdenData?.burden_band)}`}>
                {burdenData?.burden_band?.replace('_', ' ') || 'CALCULATING'}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
            Baseline expected state-wide heatstroke burden based on long-term weather patterns.
          </p>
        </div>

        {/* Real-Time Operational Risk Comparison */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-stone-200 dark:border-slate-800 flex flex-col justify-between card-3d">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Layer B: Current Weather Risk
            </span>
            <Thermometer className="w-4 h-4 text-red-500" />
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-stone-900 dark:text-white">
                {currentWeather?.heatIndex ?? 38}°C
              </span>
              <span className="text-xs font-bold text-stone-500">Live Heat Index</span>
            </div>
            <div className="mt-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                {currentWeather?.riskLevel || 'MODERATE'} OPERATIONAL RISK
              </span>
            </div>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
            Hyperlocal real-time Open-Meteo telemetry for ward field operations.
          </p>
        </div>

        {/* Model Architecture & Validation Specs */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-stone-200 dark:border-slate-800 flex flex-col justify-between card-3d">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Model Specs & Discipline
            </span>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="my-2 space-y-1.5 text-xs text-stone-600 dark:text-stone-300">
            <div className="flex justify-between">
              <span>Algorithm:</span>
              <strong className="font-mono text-stone-900 dark:text-white">XGBoost Regressor</strong>
            </div>
            <div className="flex justify-between">
              <span>Temporal Split:</span>
              <span>2001-10 Train / 2013-14 Test</span>
            </div>
            <div className="flex justify-between">
              <span>Test Performance:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">R² = 0.436 • MAE = 26.8</span>
            </div>
            <div className="flex justify-between">
              <span>Baseline Comparison:</span>
              <span className="text-stone-500">DT RMSE = 63.2 vs XGB = 62.8</span>
            </div>
          </div>
          <div className="text-[10px] font-mono text-stone-400 flex items-center justify-between">
            <span>Service: {burdenData?.service_status || 'READY'}</span>
            <span>Ver: {burdenData?.model_version || '1.0.0'}</span>
          </div>
        </div>
      </div>

      {/* Contributing Factors & Operational Advisory */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Top Contributing Factors */}
        <div className="md:col-span-7 p-4 rounded-xl bg-stone-50/80 dark:bg-slate-900/40 border border-stone-200 dark:border-slate-800">
          <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-500" />
            Top Biometeorological & Demographic Drivers
          </h3>
          <div className="space-y-2">
            {(burdenData?.contributing_factors || []).map((factor, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-stone-200/60 dark:border-slate-700/60">
                <div>
                  <span className="font-bold text-stone-800 dark:text-stone-200">{factor.factor}</span>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400">{factor.significance}</p>
                </div>
                <span className="font-mono font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-400/20">
                  {factor.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Resource Advisory */}
        <div className="md:col-span-5 p-4 rounded-xl bg-stone-50/80 dark:bg-slate-900/40 border border-stone-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Administrative Resource Protocol
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed mt-2">
              {burdenData?.operational_advisory || 'Historical baseline heat-health burden signal loaded from model weights. Intensify ward-level hydration stations and cooling protocols during extreme days.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-200 dark:border-slate-800 flex items-center gap-2 text-[11px] text-stone-500">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>Target: Municipal Disaster Preparedness & Hospital Alerting</span>
          </div>
        </div>
      </div>

      {/* Mandatory Population-Level Safety Disclaimer Banner */}
      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-700/60 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-amber-900 dark:text-amber-200 leading-normal">
          <strong>Population-Level Decision Support Disclaimer:</strong> This supervised model evaluates macro state-year heatstroke burden for municipal resource allocation (cooling centers, drinking water kiosks, emergency medical readiness). It is strictly statistical and <strong>DOES NOT</strong> predict individual medical outcomes, personal heatstroke susceptibility, or probability of death.
        </div>
      </div>
    </div>
  );
}
